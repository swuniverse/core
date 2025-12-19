import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEnergy() {
  const user = await prisma.user.findFirst({
    include: {
      player: {
        include: {
          planets: {
            include: {
              buildings: {
                where: {
                  isActive: true,
                  completedAt: { not: null }
                },
                include: {
                  buildingType: {
                    select: {
                      name: true,
                      energyProduction: true,
                      energyCostPerTick: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  const planet = user?.player?.planets?.[0];
  
  if (!planet) {
    console.log('Kein Planet gefunden');
    return;
  }

  let prod = 0;
  let cons = 0;

  console.log('Aktive Gebäude:');
  planet.buildings.forEach(b => {
    const energyProd = b.buildingType.energyProduction * b.level;
    const energyCons = b.buildingType.energyCostPerTick * b.level;
    
    prod += energyProd;
    cons += energyCons;
    
    console.log(
      `${b.buildingType.name} (Lvl ${b.level}):`,
      energyProd > 0 ? `+${energyProd}` : energyCons > 0 ? `-${energyCons}` : '0'
    );
  });

  console.log('---');
  console.log('Gesamt Produktion:', prod);
  console.log('Gesamt Verbrauch:', cons);
  console.log('Energie-Bilanz:', prod - cons);

  await prisma.$disconnect();
}

checkEnergy();
