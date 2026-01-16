#!/usr/bin/env tsx

// Test script for dynamic start planet selection
import { PrismaClient } from '@prisma/client';
import { galaxyService } from '../src/services/galaxyService';

const prisma = new PrismaClient();

async function testDynamicStartPlanets() {
  console.log('🧪 Testing Dynamic Start Planet Selection System\n');

  try {
    // Test 1: Check available habitable planets in faction territories
    console.log('📊 Checking available habitable planets by territory...');

    // Check Imperium territory (sectors 1,1 - 1,2 - 2,1 - 2,2)
    const imperiumPlanets = await prisma.planet.findMany({
      where: {
        planetClass: { in: ['CLASS_M', 'CLASS_L', 'CLASS_O'] },
        playerId: null,
        celestialType: 'PLANET',
        system: {
          sector: {
            OR: [
              { x: 1, y: 1 }, { x: 1, y: 2 },
              { x: 2, y: 1 }, { x: 2, y: 2 }
            ]
          }
        }
      },
      include: {
        system: { include: { sector: true } }
      }
    });

    // Check Rebellen territory (sectors 5,5 - 5,6 - 6,5 - 6,6)
    const rebelPlanets = await prisma.planet.findMany({
      where: {
        planetClass: { in: ['CLASS_M', 'CLASS_L', 'CLASS_O'] },
        playerId: null,
        celestialType: 'PLANET',
        system: {
          sector: {
            OR: [
              { x: 5, y: 5 }, { x: 5, y: 6 },
              { x: 6, y: 5 }, { x: 6, y: 6 }
            ]
          }
        }
      },
      include: {
        system: { include: { sector: true } }
      }
    });

    console.log(`✅ Imperium territory: ${imperiumPlanets.length} habitable planets available`);
    console.log(`✅ Rebellen territory: ${rebelPlanets.length} habitable planets available\n`);

    // Test 2: Test galaxyService.getAvailableStartPlanets() for both factions
    console.log('🎯 Testing galaxyService.getAvailableStartPlanets()...');

    const imperiumSelection = await galaxyService.getAvailableStartPlanets(1);
    console.log(`✅ Imperium selection: ${imperiumSelection.length} planets returned`);
    imperiumSelection.forEach(p => {
      console.log(`   - ${p.name} (${p.planetClass}) in ${p.systemName} at sector ${p.sectorX},${p.sectorY}`);
    });

    const rebelSelection = await galaxyService.getAvailableStartPlanets(2);
    console.log(`✅ Rebellen selection: ${rebelSelection.length} planets returned`);
    rebelSelection.forEach(p => {
      console.log(`   - ${p.name} (${p.planetClass}) in ${p.systemName} at sector ${p.sectorX},${p.sectorY}`);
    });

    // Test 3: Test refresh functionality
    console.log('\n🔄 Testing refresh functionality...');

    const refreshed1 = await galaxyService.getAvailableStartPlanets(1, { refreshCount: 1 });
    const refreshed2 = await galaxyService.getAvailableStartPlanets(1, { refreshCount: 2 });

    const samePlanets = JSON.stringify(refreshed1) === JSON.stringify(refreshed2);
    console.log(`✅ Refresh test: Different results? ${!samePlanets ? '✓' : '✗'}`);

    // Test 4: Test co-op search functionality
    console.log('\n🤝 Testing co-op search functionality...');

    // Find a system name to search for
    const testSystem = imperiumPlanets[0]?.system;
    if (testSystem) {
      console.log(`🔍 Searching near system: ${testSystem.name}`);
      const coopResults = await galaxyService.getAvailableStartPlanets(1, {
        nearSystemName: testSystem.name
      });
      console.log(`✅ Co-op search: ${coopResults.length} planets found near ${testSystem.name}`);

      // Test invalid system name
      const invalidResults = await galaxyService.getAvailableStartPlanets(1, {
        nearSystemName: 'NonExistentSystem123'
      });
      console.log(`✅ Invalid system search: ${invalidResults.length} planets (should be 0)`);
    }

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDynamicStartPlanets();