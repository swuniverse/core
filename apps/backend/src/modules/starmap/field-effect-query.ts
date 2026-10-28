import { Injectable } from '@nestjs/common';
import { FieldEffect } from '@swuniverse/shared';

export interface FieldWithEffects {
  effects?: readonly string[] | null;
  fieldType?: { effects?: readonly string[] | null } | null;
}

/** Resolves effective field effects from both the field and its field type. */
@Injectable()
export class FieldEffectQuery {
  has(field: FieldWithEffects | null | undefined, effect: FieldEffect): boolean {
    return Boolean(
      field?.effects?.includes(effect) || field?.fieldType?.effects?.includes(effect),
    );
  }
}
