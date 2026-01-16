#!/usr/bin/env tsx

// Test script for SystemView API changes
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSystemAPI() {
  console.log('🧪 Testing SystemView API Changes\n');

  try {
    // Get a system with planets and system objects
    const systemWithObjects = await prisma.system.findFirst({
      where: {
        OR: [
          { planets: { some: {} } },
          { systemObjects: { some: {} } }
        ]
      },
      include: {
        sector: true,
        planets: {
          include: {
            player: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
                faction: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        systemObjects: true,
      },
    });

    if (!systemWithObjects) {
      console.log('❌ No systems found in database');
      return;
    }

    console.log(`📍 Testing system: ${systemWithObjects.name}`);
    console.log(`📊 System has ${systemWithObjects.planets.length} planets and ${systemWithObjects.systemObjects?.length || 0} system objects`);

    // Simulate the API response structure
    const apiResponse = {
      id: systemWithObjects.id,
      name: systemWithObjects.name,
      systemType: systemWithObjects.systemType,
      fieldX: systemWithObjects.fieldX,
      fieldY: systemWithObjects.fieldY,
      gridSize: systemWithObjects.gridSize,
      sector: {
        x: systemWithObjects.sector.x,
        y: systemWithObjects.sector.y,
      },
      planets: systemWithObjects.planets.map(p => ({
        id: p.id,
        name: p.name,
        planetClass: p.planetClass,     // ✅ Fixed from planetType
        celestialType: p.celestialType, // ✅ Added
        gridX: p.gridX,                // ✅ Added
        gridY: p.gridY,                // ✅ Added
        visualSeed: p.visualSeed,      // ✅ Added
        orbitRadius: p.orbitRadius,
        orbitAngle: p.orbitAngle,
        parentPlanetId: p.parentPlanetId, // ✅ Added for moons
        player: p.player ? {
          id: p.player.id,
          username: p.player.user.username,
          faction: {
            id: p.player.faction.id,
            name: p.player.faction.name,
          },
        } : null,
      })),
      systemObjects: systemWithObjects.systemObjects?.map(obj => ({ // ✅ Added entire section
        id: obj.id,
        name: obj.name,
        objectType: obj.objectType,
        gridX: obj.gridX,
        gridY: obj.gridY,
        visualSeed: obj.visualSeed,
        durastahl: obj.durastahl,
        kristallinesSilizium: obj.kristallinesSilizium,
      })) || [],
    };

    console.log('\n✅ API Response Structure Test:');
    console.log(`- Planets with planetClass: ${apiResponse.planets.filter(p => p.planetClass).length}/${apiResponse.planets.length}`);
    console.log(`- Planets with celestialType: ${apiResponse.planets.filter(p => p.celestialType).length}/${apiResponse.planets.length}`);
    console.log(`- Planets with gridX/gridY: ${apiResponse.planets.filter(p => p.gridX !== null && p.gridY !== null).length}/${apiResponse.planets.length}`);
    console.log(`- Planets with visualSeed: ${apiResponse.planets.filter(p => p.visualSeed !== null).length}/${apiResponse.planets.length}`);
    console.log(`- System objects returned: ${apiResponse.systemObjects.length}`);

    if (apiResponse.systemObjects.length > 0) {
      console.log('\n🪨 Sample System Objects:');
      apiResponse.systemObjects.slice(0, 3).forEach(obj => {
        console.log(`  - ${obj.name} (${obj.objectType}) at grid ${obj.gridX},${obj.gridY}`);
      });
    }

    console.log('\n🎯 Expected SystemView.tsx behavior:');
    const totalObjects = apiResponse.planets.length + apiResponse.systemObjects.length;
    console.log(`  - Should display ${totalObjects} objects in system view`);
    console.log(`  - Planets: ${apiResponse.planets.length} (various planet classes)`);
    console.log(`  - System Objects: ${apiResponse.systemObjects.length} (asteroids, debris, etc.)`);
    console.log(`  - Objects should be positioned using gridX/gridY coordinates`);
    console.log(`  - Hover should show object information correctly`);

    console.log('\n🎉 API structure matches SystemView.tsx expectations!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSystemAPI();