#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAdminInvite() {
  console.log('Creating admin invite code...');

  // Check if any invite codes exist
  const existingCodes = await prisma.inviteCode.count();

  if (existingCodes > 0) {
    console.log('⚠️  Invite codes already exist, skipping admin invite creation');
    return;
  }

  // Create system invite code without a creator (null createdById)
  const adminCode = await prisma.inviteCode.create({
    data: {
      code: 'ADMIN001',
      createdById: null, // System-generated code
      isUsed: false,
    },
  });

  console.log(`✓ Admin invite code created: ${adminCode.code}`);
  console.log('  This code can be used for the first registration');
  console.log('Done!');
}

createAdminInvite()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
