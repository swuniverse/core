#!/usr/bin/env tsx
import { galaxyService } from '../src/services/galaxyService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function initGalaxy() {
  try {
    console.log('Initializing galaxy...');
    const galaxy = await galaxyService.initializeGalaxy();
    console.log(`✓ Galaxy created: ${galaxy.name}`);
    
    console.log('\nCreating start planets...');
    const startPlanets = await galaxyService.createStartPlanets();
    console.log(`✓ Created ${startPlanets.length} start planets`);
    
    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initGalaxy();
