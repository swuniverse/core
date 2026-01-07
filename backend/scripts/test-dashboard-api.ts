import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDashboard() {
  const playerId = 1; // Admin

  console.log('Testing dashboard API logic...\n');

  // Get active research (same logic as dashboard endpoint)
  const activeResearch = await prisma.playerResearch.findMany({
    where: {
      playerId: playerId,
      completedAt: null,
    },
    include: {
      researchType: {
        select: {
          name: true,
          category: true,
        },
      },
    },
    orderBy: { startedAt: 'asc' },
  });

  console.log('Active Research from DB:');
  console.log(JSON.stringify(activeResearch, null, 2));

  const mappedResearch = activeResearch.map((research) => ({
    id: research.id,
    researchTypeName: research.researchType.name,
    category: research.researchType.category,
    progress: research.currentProgress,
    maxProgress: research.maxProgress,
  }));

  console.log('\nMapped for API response:');
  console.log(JSON.stringify(mappedResearch, null, 2));

  await prisma.$disconnect();
}

testDashboard().catch((e) => {
  console.error(e);
  process.exit(1);
});
