#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { galaxyService } from '../src/services/galaxyService';

const prisma = new PrismaClient();

async function resetAndSeed() {
  try {
    console.log('🗑️  Resetting database...\n');

    // Drop and recreate database
    execSync('npx prisma migrate reset --force --skip-seed', { stdio: 'inherit' });

    console.log('\n🌱 Seeding factions...');

    // Create the two factions
    await prisma.faction.createMany({
      data: [
        {
          name: 'Galaktisches Imperium',
          description: 'Das autoritäre Regime, das die Galaxie mit eiserner Faust regiert.',
        },
        {
          name: 'Rebellen-Allianz',
          description: 'Ein mutiger Widerstand, der für Freiheit und Demokratie kämpft.',
        },
      ],
    });

    console.log('✓ Factions created\n');

    console.log('🏗️  Seeding building types...');

    // Run the building types seed script
    execSync('npx tsx scripts/seed-building-types.ts', { stdio: 'inherit' });

    console.log('\n🔬 Seeding research types...');

    // Run the research types seed script
    execSync('npx tsx scripts/seed-research-types.ts', { stdio: 'inherit' });
    console.log('\n🚀 Seeding ship types...');

    // Run the ship types seed script
    execSync('npx tsx scripts/seed-ship-types.ts', { stdio: 'inherit' });
    console.log('\n�️  Creating admin invite code...');

    // Run the admin invite seed script
    execSync('npx tsx scripts/seed-admin-invite.ts', { stdio: 'inherit' });

    console.log('\n�🌌 Initializing galaxy...');

    // Initialize Galaxy directly via service
    const galaxy = await galaxyService.initializeGalaxy();
    const startPlanets = await galaxyService.createStartPlanets();
    console.log(`✓ Galaxy initialized: ${startPlanets.length} start planets created`);

    console.log('\n✨ Database reset and seeding complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetAndSeed();
