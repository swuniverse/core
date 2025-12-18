import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addNewBuildingTypes() {
  console.log('Adding new building types...');

  const newBuildings = [
    {
      name: 'Shipyard',
      description: 'Constructs starships and fighters for your fleet. Required for building any vessels.',
      category: 'PRODUCTION',
      buildCostCredits: 800,
      buildCostMetal: 400,
      buildCostCrystal: 200,
      buildTime: 20, // minutes
      energyCost: 25,
      energyProduction: 0,
      metalProduction: 0,
      crystalProduction: 0,
      creditProduction: 0,
      storageBonus: 0,
    },
    {
      name: 'Research Lab',
      description: 'Develops new technologies to unlock advanced buildings, ships, and upgrades.',
      category: 'RESEARCH',
      buildCostCredits: 1000,
      buildCostMetal: 300,
      buildCostCrystal: 500,
      buildTime: 25, // minutes
      energyCost: 20,
      energyProduction: 0,
      metalProduction: 0,
      crystalProduction: 0,
      creditProduction: 0,
      storageBonus: 0,
    },
    {
      name: 'Defense Grid',
      description: 'Provides planetary defense against enemy fleets. Increases defensive capabilities.',
      category: 'DEFENSE',
      buildCostCredits: 600,
      buildCostMetal: 500,
      buildCostCrystal: 100,
      buildTime: 15, // minutes
      energyCost: 30,
      energyProduction: 0,
      metalProduction: 0,
      crystalProduction: 0,
      creditProduction: 0,
      storageBonus: 0,
    },
    {
      name: 'Refinery',
      description: 'Processes raw materials more efficiently, boosting metal and crystal production.',
      category: 'PRODUCTION',
      buildCostCredits: 700,
      buildCostMetal: 200,
      buildCostCrystal: 300,
      buildTime: 18, // minutes
      energyCost: 15,
      energyProduction: 0,
      metalProduction: 15,
      crystalProduction: 10,
      creditProduction: 0,
      storageBonus: 0,
    },
    {
      name: 'Hangar',
      description: 'Houses your starships and increases the maximum fleet capacity of this planet.',
      category: 'STORAGE',
      buildCostCredits: 500,
      buildCostMetal: 300,
      buildCostCrystal: 100,
      buildTime: 12, // minutes
      energyCost: 10,
      energyProduction: 0,
      metalProduction: 0,
      crystalProduction: 0,
      creditProduction: 0,
      storageBonus: 0,
    },
  ];

  for (const building of newBuildings) {
    const existing = await prisma.buildingType.findUnique({
      where: { name: building.name },
    });

    if (existing) {
      console.log(`✓ ${building.name} already exists`);
    } else {
      await prisma.buildingType.create({
        data: building,
      });
      console.log(`✓ Created ${building.name}`);
    }
  }

  console.log('Done!');
}

addNewBuildingTypes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
