import { BadRequestException } from '@nestjs/common';

export const TRANSFER_CAPACITY_PER_EPS = 5;

export function calculateTransferEnergyCost(amount: number): number {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new BadRequestException('Amount must be a positive integer');
  }
  return Math.ceil(amount / TRANSFER_CAPACITY_PER_EPS);
}
