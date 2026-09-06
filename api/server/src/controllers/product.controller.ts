import type { Request, Response } from 'express';
import prisma from '../db';
import { triggerMainSiteRevalidate } from '../services/revalidate.service';
import { z } from 'zod';

// Zod validation schemas
const productInputSchema = z.object({
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
  weight: z.coerce.number().nullable().optional(),
  length: z.coerce.number().nullable().optional(),
  width: z.coerce.number().nullable().optional(),
  height: z.coerce.number().nullable().optional(),
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
  productName: z.string().optional(),
  name: z.string().optional(),
  action: z.enum(['INBOUND', 'OUTBOUND']),
  quantity: z.coerce.number().int().positive('Quantity must be greater than zero'),
  reason: z.string().max(500).optional(),
}).refine(data => data.productId || data.sku || data.productName || data.name, {
  message: 'Either productId, sku, or productName must be provided',
  path: ['productId']
});

export const addProduct = async (req: Request, res: Response) => {
  const validation = productInputSchema.safeParse(req.body);
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
    const cleanName = data.name.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 8);
    const sku = data.sku || ('PSR-' + cleanName + '-' + Math.floor(100 + Math.random() * 900));
    const code = data.code || ('COD-' + sku);

    // Parse image URLs or base64 data URLs
    let images: string[] = [];
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      images = data.images.filter(img => Boolean(img && img.trim()));
    } else if (data.imageUrl && data.imageUrl.trim()) {
      images = [data.imageUrl.trim()];
    } else if (data.image && data.image.trim()) {
      images = [data.image.trim()];
    }
    if (images.length === 0) {
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
        material: data.material || 'Hardened High-Grade Industrial Steel',
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
        subCategory: data.subCategory || data.category || '',
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
    try {
      await triggerMainSiteRevalidate(newProduct.id);
    } catch (e) {
      // non-fatal
    }

    return res.status(201).json(newProduct);
  } catch (err: any) {
    console.error('Failed to add product:', err);
    return res.status(500).json({ error: err.message });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const validation = productInputSchema.partial().safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  try {
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { sku: id }, { code: id }]
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const data = validation.data;
    let images = product.images;
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      images = data.images.filter(img => Boolean(img && img.trim()));
    } else if (data.imageUrl && data.imageUrl.trim()) {
      images = [data.imageUrl.trim()];
    } else if (data.image && data.image.trim()) {
      images = [data.image.trim()];
    }

    const updated = await prisma.product.update({
      where: { id: product.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.code && { code: data.code }),
        ...(data.sku && { sku: data.sku }),
        ...(data.categoryId && { categoryId: data.categoryId }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.material !== undefined && { material: data.material }),
        ...(data.weight !== undefined && { weight: data.weight }),
        ...(data.unit && { unit: data.unit }),
        ...(data.minStock !== undefined && { minStock: data.minStock }),
        ...(data.maxStock !== undefined && { maxStock: data.maxStock }),
        ...(data.currentStock !== undefined && { currentStock: data.currentStock }),
        ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
        ...(data.sellingPrice !== undefined && { sellingPrice: data.sellingPrice }),
        ...(data.status && { status: data.status as any }),
        images,
      },
      include: {
        category: true,
      }
    });

    // Trigger instant cache revalidation on the main website
    try {
      await triggerMainSiteRevalidate(updated.id);
    } catch (e) {
      // non-fatal
    }

    return res.json(updated);
  } catch (err: any) {
    console.error('Failed to update product:', err);
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
    try {
      await triggerMainSiteRevalidate(product.id);
    } catch (e) {
      // non-fatal
    }

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

      const productImages = (prod.images && prod.images.length > 0)
        ? prod.images
        : ['/images/inventory/IMG_3086.jpg'];

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
        images: productImages,
        imageUrl: productImages[0],
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

  const { sku, productId, productName, name, quantity, action, reason } = validation.data;
  const userId = (req as any).auth?.userId || 'client_website';
  const searchName = (name || productName || '').trim();

  try {
    const updatedProduct = await prisma.$transaction(async (tx) => {
      let product = await tx.product.findFirst({
        where: productId
          ? { id: productId }
          : sku
          ? {
              OR: [
                { sku: { equals: sku, mode: 'insensitive' } },
                { name: { equals: sku, mode: 'insensitive' } }
              ]
            }
          : searchName
          ? {
              OR: [
                { name: { equals: searchName, mode: 'insensitive' } },
                { sku: { equals: searchName, mode: 'insensitive' } }
              ]
            }
          : undefined
      });

      if (!product) {
        if (action === 'INBOUND') {
          // Auto-create product for inbound arrival if not existing yet
          const pName = searchName || sku || 'New Inbound Product';
          const cleanName = pName.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 8) || 'ITEM';
          const genSku = (sku && sku.trim().length > 0 && !sku.includes(' '))
            ? sku.trim().toUpperCase()
            : ('PSR-' + cleanName + '-' + Math.floor(100 + Math.random() * 900));

          let defaultCat = await tx.category.findFirst();
          if (!defaultCat) {
            defaultCat = await tx.category.create({
              data: { name: 'Drilling Rigs & Machinery' }
            });
          }

          product = await tx.product.create({
            data: {
              name: pName,
              code: 'COD-' + genSku,
              sku: genSku,
              categoryId: defaultCat.id,
              description: pName,
              material: 'Hardened High-Grade Industrial Steel',
              unit: 'pcs',
              manufacturer: "PSR'S Drills",
              currentStock: 0,
              minStock: 5,
              maxStock: 500,
              costPrice: 0,
              sellingPrice: 0,
              currency: 'USD',
              status: 'OUT_OF_STOCK',
              images: ['/images/inventory/IMG_3086.jpg']
            }
          });
        } else {
          throw new Error('PRODUCT_NOT_FOUND');
        }
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
    try {
      await triggerMainSiteRevalidate(updatedProduct.id);
    } catch (e) {
      // non-fatal
    }

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

export const getWarehouses = async (_req: Request, res: Response) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        racks: {
          include: {
            positions: true,
            stockLocations: {
              include: {
                product: true
              }
            }
          }
        }
      }
    });
    return res.json(warehouses);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

