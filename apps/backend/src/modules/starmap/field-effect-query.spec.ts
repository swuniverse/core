import { FieldEffect } from '@swuniverse/shared';
import { FieldEffectQuery } from './field-effect-query';

const query = new FieldEffectQuery();

describe('FieldEffectQuery', () => {
  it('recognizes an effect inherited from the field type', () => {
    const field = {
      effects: null,
      fieldType: { effects: [FieldEffect.NO_MEASUREPOINT] },
    };

    expect(query.has(field, FieldEffect.NO_MEASUREPOINT)).toBe(true);
  });

  it('recognizes a field-specific effect', () => {
    const field = {
      effects: [FieldEffect.NO_STATION_CONSTRUCTION],
      fieldType: { effects: null },
    };

    expect(query.has(field, FieldEffect.NO_STATION_CONSTRUCTION)).toBe(true);
  });
});
