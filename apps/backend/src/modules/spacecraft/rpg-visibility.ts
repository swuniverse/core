import { NotFoundException } from '@nestjs/common';

export type RpgVisibility = { rpgHidden?: boolean };

/** Administrative scene hiding applies to every player view, including the owner. */
export function isRpgHidden(ship: RpgVisibility | null | undefined): boolean {
  return ship?.rpgHidden === true;
}

export function requirePlayerSpacecraft(
  ship: RpgVisibility | null | undefined,
): void {
  if (!ship || isRpgHidden(ship))
    throw new NotFoundException('Spacecraft not found');
}
