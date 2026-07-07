import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Seed Categories
  const categories = [
    { name: 'Drilling Rigs & Machinery' },
    { name: 'Rotation Motors' },
    { name: 'Crankcase' },
    { name: 'Piston Assembly' },
    { name: 'Valves' },
    { name: 'Bearings & Seals' },
    { name: 'Fasteners' },
    { name: 'Air System' },
  ];

  const categoryMap: Record<string, string> = {};

  for (const cat of categories) {
    const createdCat = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: { name: cat.name },
    });
    categoryMap[cat.name] = createdCat.id;
  }
  console.log('Categories seeded:', Object.keys(categoryMap).length);

  // 2. Seed Warehouses
  const warehouses = [
    { name: 'Main Warehouse A', code: 'WH-A', address: 'Sanath Nagar Industrial Area, Hyderabad', capacity: 5000 },
    { name: 'Warehouse B', code: 'WH-B', address: 'Peenya Industrial Area, Bengaluru', capacity: 3000 },
    { name: 'Warehouse C', code: 'WH-C', address: 'Bhosari Industrial Area, Pune', capacity: 4000 },
  ];

  const warehouseMap: Record<string, string> = {};
  for (const wh of warehouses) {
    const createdWh = await prisma.warehouse.upsert({
      where: { code: wh.code },
      update: {},
      create: wh,
    });
    warehouseMap[wh.name] = createdWh.id;
  }
  console.log('Warehouses seeded:', Object.keys(warehouseMap).length);

  // 3. Seed Products
  const productsToSeed = [
    {
      name: 'Airtech Pneumatic Rotation Motor (Full Assembly)',
      sku: 'PRM-AT-70L4R',
      code: 'AT-70L4R',
      category: 'Rotation Motors',
      compatibleMachine: 'PSR-W100 Pneumatic Wagon Drill, PSR-C300 Crawler Drill',
      description: 'Complete heavy-duty 4-piston horizontal radial air rotation motor.',
      material: 'Ductile Cast Iron, High-Alloy Carbon Steel',
      weight: 48.5,
      length: 650,
      width: 280,
      height: 290,
      unit: 'pcs',
      manufacturer: 'Airtech Pneumatics Ltd.',
      minStock: 5,
      maxStock: 50,
      currentStock: 8,
      status: 'AVAILABLE',
      images: ['/images/inventory/IMG_3116.jpg'],
      explodedView: '/images/inventory/IMG_3104.jpg',
      barcode: 'BAR-PRM-70L4R',
      qrCode: 'QR-PRM-AT-70L4R',
    },
    {
      name: 'Cast Iron Crankcase Housing',
      sku: 'AT-CCH-001',
      code: 'CCH-001',
      category: 'Crankcase',
      compatibleMachine: 'Airtech 70L4R Motor',
      description: 'Heavy cast-iron crankcase engine body block with four cylinder ports.',
      material: 'SG Ductile Iron Casting (Grade 500-7)',
      weight: 18.2,
      length: 340,
      width: 320,
      height: 280,
      unit: 'pcs',
      manufacturer: "PSR'S Forging Division",
      minStock: 10,
      maxStock: 100,
      currentStock: 14,
      status: 'AVAILABLE',
      images: ['/images/inventory/crank case.jpg'],
      barcode: 'BAR-CCH-001',
      qrCode: 'QR-AT-CCH-001',
    },
    {
      name: 'Reciprocating Piston Head',
      sku: 'AT-RPH-002',
      code: 'RPH-002',
      category: 'Piston Assembly',
      compatibleMachine: 'Airtech 70L4R Motor',
      description: 'CNC-machined aluminum alloy piston head with dual compression grooves.',
      material: 'Anodized 6061-T6 Aluminum Alloy',
      weight: 0.85,
      length: 70,
      width: 70,
      height: 55,
      unit: 'pcs',
      manufacturer: 'Airtech Pneumatics Ltd.',
      minStock: 20,
      maxStock: 200,
      currentStock: 25,
      status: 'AVAILABLE',
      images: ['/images/inventory/piston.jpg'],
      barcode: 'BAR-RPH-002',
      qrCode: 'QR-AT-RPH-002',
    },
    {
      name: 'Water Swivel Seal Kit',
      sku: 'PSR-SK-05',
      code: 'PROD-003',
      category: 'Bearings & Seals',
      compatibleMachine: 'General Drilling Rigs',
      description: 'High-pressure water swivel polyurethane and nitrile seals.',
      material: 'Polyurethane & Nitrile Rubber',
      weight: 0.15,
      length: 80,
      width: 80,
      height: 20,
      unit: 'set',
      manufacturer: 'PSR Seals Division',
      minStock: 20,
      maxStock: 150,
      currentStock: 0,
      status: 'OUT_OF_STOCK',
      images: ['/images/inventory/o ring.jpg'],
      barcode: 'BAR-SK-05',
      qrCode: 'QR-PSR-SK-05',
    },
    {
      name: 'Button Drill Bit 32mm',
      sku: 'PSR-BT-32',
      code: 'PROD-001',
      category: 'Drilling Rigs & Machinery',
      compatibleMachine: 'PSR Crawler Drills',
      description: 'Tungsten carbide button thread drill bit for hard rock formations.',
      material: 'Tungsten Carbide, Alloy Steel',
      weight: 1.2,
      length: 120,
      width: 32,
      height: 32,
      unit: 'pcs',
      manufacturer: 'PSR Forging Division',
      minStock: 15,
      maxStock: 200,
      currentStock: 8,
      status: 'LOW_STOCK',
      images: ['/images/inventory/IMG_3086.jpg'],
      barcode: 'BAR-BT-32',
      qrCode: 'QR-PSR-BT-32',
    }
  ];

  for (const prod of productsToSeed) {
    const categoryId = categoryMap[prod.category];
    if (!categoryId) {
      console.warn(`Category "${prod.category}" not found for product "${prod.name}". Skipping.`);
      continue;
    }

    const { category, ...productData } = prod;

    const createdProduct = await prisma.product.upsert({
      where: { sku: prod.sku },
      update: {
        currentStock: prod.currentStock,
        status: prod.status as any,
      },
      create: {
        ...productData,
        status: prod.status as any,
        categoryId,
      },
    });

    console.log(`Product upserted: ${createdProduct.name} (SKU: ${createdProduct.sku})`);
  }

  console.log('Seeding completed successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
  });
