#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { galaxyService } from '../src/services/galaxyService';

// Construct DATABASE_URL if not set
if (!process.env.DATABASE_URL) {
  const postgresPassword = process.env.POSTGRES_PASSWORD;
  const postgresHost = process.env.POSTGRES_HOST || 'localhost';
  const postgresPort = process.env.POSTGRES_PORT || '5432';
  
  if (!postgresPassword) {
    throw new Error('POSTGRES_PASSWORD environment variable is required');
  }
  
  // URL encode the password using Node.js
  const encodedPassword = postgresPassword
    .split('')
    .map(char => {
      const code = char.charCodeAt(0);
      if (
        (code >= 48 && code <= 57) || // 0-9
        (code >= 65 && code <= 90) || // A-Z
        (code >= 97 && code <= 122) || // a-z
        char === '-' || char === '_' || char === '.' || char === '~'
      ) {
        return char;
      }
      return '%' + code.toString(16).toUpperCase().padStart(2, '0');
    })
    .join('');
  
  process.env.DATABASE_URL = `postgresql://postgres:${encodedPassword}@${postgresHost}:${postgresPort}/swuniverse_game?schema=public`;
}

const prisma = new PrismaClient();

async function resetAndSeed() {
  try {
    console.log('🗑️  Resetting database...\n');

    // Drop and recreate database with current schema (STU-style system objects)
    execSync('npx prisma db push --force-reset', { stdio: 'inherit' });

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
    console.log('✓ Galaxy initialized with dynamic start planet selection');
    console.log('✓ Players will select from generated habitable planets in faction territories');

    console.log('\n✨ Database reset and seeding complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetAndSeed();
