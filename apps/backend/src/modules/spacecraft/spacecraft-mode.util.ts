import { BadRequestException } from '@nestjs/common';
import type { Spacecraft } from './entities/spacecraft.entity';

export function assertSpacecraftNotInStandby(
  ship: Pick<Spacecraft, 'operatingMode'>,
  action: string,
): void {
  if (ship.operatingMode === 'STANDBY') {
    throw new BadRequestException(`Standby muss vor ${action} beendet werden`);
  }
}
