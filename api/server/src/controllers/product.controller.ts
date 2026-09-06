import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { triggerMainSiteRevalidate } from '../services/revalidate.service';
import { z } from 'zod';

const prisma = new PrismaClient();

// Zod validation schemas
const addProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional(),
  sku: z.string().optional(),
  categoryId: z.string().optional(),
  category: z.string().optional(),
  partNumber: z.string().nullable().optional(),
  modelNumber: z.string().nullable().optional(),
  compatibleMachine: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  longDescription: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  dimensions: z.string().nullable().optional(),
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
  costPrice: z.coerce.number().nonnegative().default(0),
  sellingPrice: z.coerce.number().nonnegative().default(0),
  currency: z.string().default('USD'),
  subCategory: z.string().default(''),
  status: z.enum(['AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK', 'DAMAGED']).optional(),
  images: z.array(z.string()).optional(),
  image: z.string().optional(),
  imageUrl: z.string().optional(),
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
    const data = validation.data;
    let categoryId = data.categoryId;

    // Resolve or auto-create category
    if (!categoryId) {
      const catName = data.category || 'Drilling Rigs & Machinery';
      let existingCat = await prisma.category.findFirst({
        where: { name: { equals: catName, mode: 'insensitive' } }
      });
      if (!existingCat) {
        existingCat = await prisma.category.create({
          data: { name: catName }
        });
      }
      categoryId = existingCat.id;
    }

    // Auto-generate SKU and code if not provided
    const sku = data.sku || ('PSR-' + data.name.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 8) + '-' + Math.floor(100 + Math.random() * 900));
    const code = data.code || ('COD-' + sku);

    // Parse image URLs
    let images: string[] = [];
    if (data.images && Array.isArray(data.images)) {
      images = data.images;
    } else if (data.imageUrl) {
      images = [data.imageUrl];
    } else if (data.image) {
      images = [data.image];
    } else {
      images = ['/images/inventory/IMG_3086.jpg'];
    }

    // Determine status
    let currentStock = data.currentStock || 0;
    let minStock = data.minStock || 10;
    let status: 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'AVAILABLE';
    if (currentStock === 0) status = 'OUT_OF_STOCK';
    else if (currentStock < minStock) status = 'LOW_STOCK';

    const newProduct = await prisma.product.create({
      data: {
        name: data.name,
        code,
        sku,
        categoryId,
        partNumber: data.partNumber || null,
        modelNumber: data.modelNumber || null,
        compatibleMachine: data.compatibleMachine || null,
        description: data.description || data.name,
        material: data.material || null,
        weight: data.weight || null,
        length: data.length || null,
        width: data.width || null,
        height: data.height || null,
        unit: data.unit || 'pcs',
        manufacturer: data.manufacturer || "PSR'S Drills",
        supplierId: data.supplierId || null,
        minStock: data.minStock || 10,
        maxStock: data.maxStock || 1000,
        currentStock,
        reservedStock: data.reservedStock || 0,
        costPrice: data.costPrice || 0,
        sellingPrice: data.sellingPrice || 0,
        currency: data.currency || 'USD',
        subCategory: data.subCategory || '',
        status: (data.status as any) || status,
        images,
      },
      include: {
        category: true,
      }
    });

    // Create default ProductLocation in first warehouse if exists
    try {
      const defaultWh = await prisma.warehouse.findFirst();
      if (defaultWh) {
        let defaultRack = await prisma.rack.findFirst({ where: { warehouseId: defaultWh.id } });
        if (!defaultRack) {
          defaultRack = await prisma.rack.create({ data: { name: 'Rack A', warehouseId: defaultWh.id } });
        }
        let defaultPos = await prisma.position.findFirst({ where: { rackId: defaultRack.id } });
        if (!defaultPos) {
          defaultPos = await prisma.position.create({ data: { name: 'Pos 1', rackId: defaultRack.id } });
        }

        await prisma.productLocation.create({
          data: {
            productId: newProduct.id,
            warehouseId: defaultWh.id,
            rackId: defaultRack.id,
            positionId: defaultPos.id,
            shelfNumber: 'Shelf 1',
            quantity: newProduct.currentStock
          }
        });
      }
    } catch (e: any) {
      console.warn('[Location Note] Location creation skipped:', e.message);
    }
    
    // Trigger instant cache revalidation on the main website
    await triggerMainSiteRevalidate(newProduct.id);

    return res.status(201).json(newProduct);
  } catch (err: any) {
    console.error('Failed to add product:', err);
    return res.status(500).json({ error: err.message });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id },
          { sku: id },
          { code: id }
        ]
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete related records to prevent foreign key constraint violations
    await prisma.productLocation.deleteMany({ where: { productId: product.id } });
    await prisma.stockMovement.deleteMany({ where: { productId: product.id } });
    await prisma.projectAllocation.deleteMany({ where: { productId: product.id } });
    await prisma.stockEntry.deleteMany({ where: { productId: product.id } });
    await prisma.stockOut.deleteMany({ where: { productId: product.id } });
    await prisma.damagedInventory.deleteMany({ where: { productId: product.id } });
    await prisma.productMovement.deleteMany({ where: { productId: product.id } });

    await prisma.product.delete({
      where: { id: product.id }
    });

    // Trigger instant cache revalidation on the main website
    await triggerMainSiteRevalidate(product.id);

    return res.json({ 
      success: true, 
      message: 'Product deleted successfully', 
      deletedId: product.id,
      deletedSku: product.sku 
    });
  } catch (err: any) {
    console.error('Failed to delete product:', err);
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
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(products);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getInventory = async (_req: Request, res: Response) => {
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
      },
      orderBy: { createdAt: 'desc' }
    });

    // Map each product into standard InventoryItem format
    const inventoryItems = products.map(prod => {
      const firstLoc = prod.stockLocations?.[0];
      const dimensions = (prod.length && prod.width && prod.height) 
        ? `${prod.length}mm x ${prod.width}mm x ${prod.height}mm` 
        : 'Standard OEM';
      
      const statusMap: Record<string, string> = {
        'AVAILABLE': 'In Stock',
        'LOW_STOCK': 'Low Stock',
        'OUT_OF_STOCK': 'Out of Stock',
        'DAMAGED': 'Out of Stock'
      };

      return {
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        productCode: prod.code,
        category: prod.category?.name || 'Drilling Rigs & Machinery',
        subCategory: prod.subCategory || prod.category?.name || 'General',
        manufacturer: prod.manufacturer || "PSR'S Forging Division",
        compatibleMachine: prod.compatibleMachine || 'PSR Standard Rig',
        description: prod.description || prod.name,
        longDescription: prod.description || prod.name,
        material: prod.material || 'Hardened Forged Steel',
        dimensions,
        weight: prod.weight ? `${prod.weight} kg` : 'N/A',
        costPrice: prod.costPrice || 0,
        sellingPrice: prod.sellingPrice || 0,
        currency: prod.currency || 'USD',
        currentStock: prod.currentStock,
        minStock: prod.minStock,
        maxStock: prod.maxStock,
        warehouse: firstLoc?.warehouse?.name || 'Main Warehouse A',
        rack: firstLoc?.rack?.name || 'Rack A',
        rackPosition: firstLoc?.position?.name || 'Pos 1',
        shelfNumber: firstLoc?.shelfNumber || 'Shelf 1',
        status: statusMap[prod.status] || (prod.currentStock > 10 ? 'In Stock' : prod.currentStock > 0 ? 'Low Stock' : 'Out of Stock'),
        images: prod.images && prod.images.length > 0 ? prod.images : ['/images/inventory/IMG_3086.jpg'],
        barcode: prod.barcode || `BAR-${prod.sku}`,
        qrCode: prod.qrCode || `QR-${prod.sku}`,
        lastUpdatedDate: prod.updatedAt ? new Date(prod.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      };
    });

    return res.json(inventoryItems);
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

