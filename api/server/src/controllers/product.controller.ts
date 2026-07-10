import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { triggerMainSiteRevalidate } from '../services/revalidate.service';
import { z } from 'zod';

const prisma = new PrismaClient();

// Zod validation schemas
const addProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  sku: z.string().min(1, 'SKU is required'),
  categoryId: z.string().min(1, 'CategoryId is required'),
  partNumber: z.string().nullable().optional(),
  modelNumber: z.string().nullable().optional(),
  compatibleMachine: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  weight: z.coerce.number().positive().nullable().optional(),
  length: z.coerce.number().positive().nullable().optional(),
  width: z.coerce.number().positive().nullable().optional(),
  height: z.coerce.number().positive().nullable().optional(),
  unit: z.string().default('pcs'),
  manufacturer: z.string().nullable().optional(),
  supplierId: z.string().nullable().optional(),
  minStock: z.coerce.number().int().nonnegative().default(10),
  maxStock: z.coerce.number().int().nonnegative().default(1000),
  currentStock: z.coerce.number().int().nonnegative().default(0),
  reservedStock: z.coerce.number().int().nonnegative().default(0),
  status: z.enum(['AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK', 'DAMAGED']).default('AVAILABLE'),
});

const adjustStockSchema = z.object({
  productId: z.string().optional(),
  sku: z.string().optional(),
  action: z.enum(['INBOUND', 'OUTBOUND']),
  quantity: z.coerce.number().int().positive('Quantity must be greater than zero'),
  reason: z.string().max(500).optional(),
}).refine(data => data.productId || data.sku, {
  message: 'Either productId or sku must be provided',
  path: ['productId']
});

export const addProduct = async (req: Request, res: Response) => {
  const validation = addProductSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  try {
    const newProduct = await prisma.product.create({ data: validation.data });
    
    // Trigger instant cache revalidation on the main website
    await triggerMainSiteRevalidate(newProduct.id);

    return res.status(201).json(newProduct);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getProducts = async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        stockLocations: {
          include: {
            warehouse: true,
            rack: true,
            position: true,
          }
        }
      }
    });
    return res.json(products);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getInventory = async (_req: Request, res: Response) => {
  try {
    const productLocations = await prisma.productLocation.findMany({
      include: {
        product: true,
        warehouse: true,
        rack: true,
        position: true,
      }
    });

    return res.json(productLocations);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany();
    return res.json(categories);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const adjustStock = async (req: Request, res: Response) => {
  const validation = adjustStockSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.flatten().fieldErrors });
  }

  const { sku, productId, quantity, action, reason } = validation.data;
  const userId = (req as any).auth?.userId || 'client_website';

  try {
    const updatedProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: sku ? { sku } : { id: productId }
      });

      if (!product) {
        throw new Error('PRODUCT_NOT_FOUND');
      }

      if (!product.isActive) {
        throw new Error('PRODUCT_INACTIVE');
      }

      if (action === 'OUTBOUND' && product.currentStock < quantity) {
        throw new Error('INSUFFICIENT_STOCK');
      }

      const qtyAdj = action === 'OUTBOUND' ? -quantity : quantity;
      const newStock = product.currentStock + qtyAdj;

      // Recalculate status
      let newStatus = 'AVAILABLE';
      if (newStock === 0) {
        newStatus = 'OUT_OF_STOCK';
      } else if (newStock < product.minStock) {
        newStatus = 'LOW_STOCK';
      }

      // Update product stock levels
      const updated = await tx.product.update({
        where: { id: product.id },
        data: {
          currentStock: newStock,
          status: newStatus as any
        }
      });

      // Update related ProductLocation quantity if it exists
      const firstLoc = await tx.productLocation.findFirst({
        where: { productId: product.id }
      });
      if (firstLoc) {
        await tx.productLocation.update({
          where: { id: firstLoc.id },
          data: { quantity: newStock }
        });
      }

      // Insert audit trail log into StockMovement table
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          action,
          quantity,
          userId,
          reason: reason || `Stock ${action.toLowerCase()} adjustment processed.`
        }
      });

      return updated;
    }, {
      isolationLevel: 'Serializable'
    });

    // Trigger instant cache revalidation on the main website
    await triggerMainSiteRevalidate(updatedProduct.id);

    return res.json(updatedProduct);
  } catch (err: any) {
    if (err.message === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (err.message === 'PRODUCT_INACTIVE') {
      return res.status(400).json({ error: 'Cannot adjust stock of an inactive product.' });
    }
    if (err.message === 'INSUFFICIENT_STOCK') {
      return res.status(400).json({ error: 'Insufficient stock levels available.' });
    }
    return res.status(500).json({ error: err.message });
  }
};
