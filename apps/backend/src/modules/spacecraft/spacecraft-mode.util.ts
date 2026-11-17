import { requirePlayerSpacecraft, type RpgVisibility } from './rpg-visibility';
import { BadRequestException } from '@nestjs/common';
import type { Spacecraft } from './entities/spacecraft.entity';

export function assertSpacecraftNotInStandby(
  ship: Pick<Spacecraft, 'operatingMode'> & RpgVisibility,
  action: string,
): void {
  requirePlayerSpacecraft(ship);
  if (ship.operatingMode === 'STANDBY') {
    throw new BadRequestException(`Standby muss vor ${action} beendet werden`);
  }
}
