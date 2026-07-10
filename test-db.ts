import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- RUNNING DB DIAGNOSTICS ---');
  await prisma.productLocation.deleteMany({});
  console.log('Cleared ProductLocation table.');

  const dbProducts = await prisma.product.findMany();
  console.log('Total products:', dbProducts.length);

  const warehouses = await prisma.warehouse.findMany();
  const warehouseMap = Object.fromEntries(warehouses.map(w => [w.name, w.id]));

  const warehouseNames = ['Main Warehouse A', 'Small Parts Sump B', 'Bearing Drawer C', 'Logistics Locker D'];
  const rackNames = ['Rack A', 'Rack B', 'Rack C', 'Rack D', 'Rack P', 'Rack S'];
  const shelfNames = ['Shelf 1', 'Shelf 2', 'Shelf 3', 'Shelf 4', 'Shelf 5'];
  const positionNames = ['Pos 1', 'Pos 2', 'Pos 3', 'Pos 4'];

  let locationIndex = 0;
  
  for (const whName of warehouseNames) {
    const warehouseId = warehouseMap[whName];
    if (!warehouseId) {
      console.log('Warehouse not found:', whName);
      continue;
    }
    
    for (const rackName of rackNames) {
      const rack = await prisma.rack.upsert({
        where: { id: `rack-${rackName}-${warehouseId}` },
        create: {
          id: `rack-${rackName}-${warehouseId}`,
          name: rackName,
          warehouseId,
        },
        update: {},
      });
      
      for (const posName of positionNames) {
        const position = await prisma.position.upsert({
          where: { id: `pos-${posName}-${rack.id}` },
          create: {
            id: `pos-${posName}-${rack.id}`,
            name: posName,
            rackId: rack.id,
          },
          update: {},
        });
        
        for (const shelfName of shelfNames) {
          const product = dbProducts[locationIndex % dbProducts.length];
          const qtyRaw = (locationIndex * 31) % 100;
          const quantity = qtyRaw < 15 ? 0 : qtyRaw;
          
          if (quantity > 0) {
            console.log(`Inserting: product=${product.id} (${product.sku}), warehouse=${warehouseId}, rack=${rack.id}, position=${position.id}, shelf=${shelfName}`);
            try {
              await prisma.productLocation.create({
                data: {
                  productId: product.id,
                  warehouseId,
                  rackId: rack.id,
                  positionId: position.id,
                  shelfNumber: shelfName,
                  quantity,
                }
              });
              console.log('Success!');
            } catch (err: any) {
              console.error('Failed on insert!', err);
              return;
            }
          }
          
          locationIndex++;
        }
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
