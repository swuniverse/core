import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedFactions() {
  console.log('Seeding factions...');

  const empire = await prisma.faction.upsert({
    where: { name: 'Galaktisches Imperium' },
    update: {},
    create: {
      id: 1,
      name: 'Galaktisches Imperium',
      description: 'Das autoritäre Regime, das die Galaxie mit eiserner Faust regiert',
    },
  });

  const rebels = await prisma.faction.upsert({
    where: { name: 'Rebellen-Allianz' },
    update: {},
    create: {
      id: 2,
      name: 'Rebellen-Allianz',
      description: 'Ein mutiger Widerstand, der für Freiheit und Demokratie kämpft',
    },
  });

  console.log('✓ Created factions:', empire.name, rebels.name);
  console.log('Done!');
}

seedFactions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
