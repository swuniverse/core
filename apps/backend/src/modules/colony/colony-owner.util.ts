import { BadRequestException } from '@nestjs/common';
import { Colony } from './entities/colony.entity';

export type OwnedColony = Colony & { userId: number };

export function isOwnedColony(colony: Colony): colony is OwnedColony {
  return colony.userId != null && !colony.isAbandoned;
}

export function assertOwnedColony(
  colony: Colony,
): asserts colony is OwnedColony {
  if (!isOwnedColony(colony)) {
    throw new BadRequestException('Colony is abandoned');
  }
}
