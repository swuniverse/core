import type { SpaceLocationDto } from '@swuniverse/shared';
import type { Colony } from './entities/colony.entity';

export type ColonyLocationSource = Pick<
  Colony,
  'starSystemId' | 'posX' | 'posY'
> & {
  systemFieldId?: number | null;
  systemField?: Pick<SystemFieldLocation, 'starSystemId' | 'sx' | 'sy'> | null;
};

type SystemFieldLocation = {
  starSystemId: number;
  sx: number;
  sy: number;
};

export function resolveColonyLocation(
  colony: ColonyLocationSource,
): Extract<SpaceLocationDto, { scope: 'SYSTEM' }> | null {
  if (colony.systemField) {
    return {
      scope: 'SYSTEM',
      systemId: colony.systemField.starSystemId,
      x: colony.systemField.sx,
      y: colony.systemField.sy,
    };
  }
  if (colony.starSystemId == null) return null;
  return {
    scope: 'SYSTEM',
    systemId: colony.starSystemId,
    x: colony.posX,
    y: colony.posY,
  };
}
