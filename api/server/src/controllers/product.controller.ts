// server/src/controllers/product.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { triggerMainSiteRevalidate } from '../services/revalidate.service';

const prisma = new PrismaClient();

// Add a product
export const addProduct = async (req: Request, res: Response) => {
  try {
    const newProduct = await prisma.product.create({ data: req.body });
    // Trigger instant cache revalidation on the main website
    await triggerMainSiteRevalidate(newProduct.id);
    return res.status(201).json(newProduct);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Retrieve all products
export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return res.json(products);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Retrieve all categories
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    return res.json(categories);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Retrieve products mapped as inventory items
export const getInventory = async (req: Request, res: Response) => {
  try {
    const dbProducts = await prisma.product.findMany({
      include: {
        category: true,
        stockLocations: {
          include: {
            warehouse: true,
            rack: true,
            position: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const inventoryItems = dbProducts.map((product: any) => {
      const loc = product.stockLocations?.[0];
      const warehouseName = loc?.warehouse?.name || 'Main Warehouse A';
      const rackName = loc?.rack?.name || 'Heavy Storage Rack R-12';
      const positionName = loc?.position?.name || 'B4';

      let mappedStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
      if (product.currentStock <= 0) {
        mappedStatus = 'Out of Stock';
      } else if (product.currentStock < product.minStock) {
        mappedStatus = 'Low Stock';
      }

      return {
        name: product.name,
        sku: product.sku,
        productCode: product.code,
        category: product.category?.name || 'General',
        subCategory: product.modelNumber || 'Pneumatic Parts',
        manufacturer: product.manufacturer || 'Airtech Pneumatics Ltd.',
        compatibleMachine: product.compatibleMachine || 'PSR-W100 Pneumatic Wagon Drill, PSR-C300 Crawler Drill',
        description: product.description || 'Precision replacement part.',
        longDescription: product.description || 'Precision replacement part designed for heavy-duty industrial drilling operations.',
        material: product.material || 'High-Alloy Carbon Steel',
        dimensions: (product.length && product.width && product.height)
          ? `${product.length}mm x ${product.width}mm x ${product.height}mm`
          : '300mm x 150mm x 150mm',
        weight: product.weight ? `${product.weight} kg` : '1.5 kg',
        costPrice: 150.00,
        sellingPrice: 220.00,
        currency: 'USD',
        currentStock: product.currentStock,
        warehouse: warehouseName,
        rack: rackName,
        rackPosition: positionName,
        status: mappedStatus,
        images: product.images && product.images.length > 0
          ? product.images
          : ['/images/inventory/IMG_3086.jpg'],
        technicalDrawing: product.technicalDrawing || undefined,
        explodedView: product.explodedView || undefined,
        barcode: product.barcode || `BAR-${product.sku}`,
        qrCode: product.qrCode || `QR-${product.sku}`,
        lastUpdatedDate: product.updatedAt ? product.updatedAt.toISOString().split('T')[0] : '2026-07-02',
      };
    });

    return res.json(inventoryItems);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};