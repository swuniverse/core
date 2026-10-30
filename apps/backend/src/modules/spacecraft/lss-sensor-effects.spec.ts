import { FieldEffect } from '@swuniverse/shared';
import { applyLssSensorEffects } from './lss-sensor-effects';

type Field = {
  id: number;
  x: number;
  y: number;
  fieldType: { id: number; key: string; name: string; effects?: string[] | null };
  effects?: string[] | null;
  secret: string;
};

const field = (id: number, x: number, y: number, effects: FieldEffect[] = []): Field => ({
  id,
  x,
  y,
  fieldType: { id, key: `FIELD_${id}`, name: `Field ${id}` },
  effects,
  secret: `secret-${id}`,
});

describe('applyLssSensorEffects', () => {
  it('returns only the observer field when long-range sensors malfunction', () => {
    const result = applyLssSensorEffects({
      fields: [field(1, 2, 2, [FieldEffect.LSS_MALFUNCTION]), field(2, 3, 2)],
      observer: { x: 2, y: 2 },
      position: (entry) => ({ x: entry.x, y: entry.y }),
      signatures: [{ x: 2, y: 2, visibleCount: 1 }, { x: 3, y: 2, visibleCount: 4 }],
    });

    expect(result.warning).toBe('Langstreckensensoren liefern keine verwertbaren Daten');
    expect(result.fields).toEqual([expect.objectContaining({ id: 1 })]);
    expect(result.signatures).toEqual([{ x: 2, y: 2, state: 'COUNT', count: 1 }]);
  });

  it('redacts blockade fields, fields behind them, and corner-blocked fields', () => {
    const result = applyLssSensorEffects({
      fields: [
        field(1, 1, 1),
        field(2, 2, 1, [FieldEffect.LSS_BLOCKADE]),
        field(3, 3, 1),
        field(4, 1, 2, [FieldEffect.LSS_BLOCKADE]),
        field(5, 2, 2),
        field(6, 3, 3),
      ],
      observer: { x: 1, y: 1 },
      position: (entry) => ({ x: entry.x, y: entry.y }),
      signatures: [
        { x: 2, y: 1, visibleCount: 2 },
        { x: 3, y: 1, visibleCount: 3 },
        { x: 2, y: 2, visibleCount: 4 },
      ],
    });

    expect(result.fields).toEqual([
      expect.objectContaining({ id: 1 }),
      { x: 2, y: 1, redacted: true },
      { x: 3, y: 1, redacted: true },
      { x: 1, y: 2, redacted: true },
      { x: 2, y: 2, redacted: true },
      { x: 3, y: 3, redacted: true },
    ]);
    expect(result.signatures).toEqual([]);
  });

  it('omits signature data on NO_SPACECRAFT_COUNT fields', () => {
    const result = applyLssSensorEffects({
      fields: [field(1, 1, 1, [FieldEffect.NO_SPACECRAFT_COUNT])],
      observer: { x: 2, y: 2 },
      position: (entry) => ({ x: entry.x, y: entry.y }),
      signatures: [{ x: 1, y: 1, visibleCount: 7 }],
    });

    expect(result.signatures).toEqual([]);
  });

  it('replaces a positive count with DUBIOUS without transmitting the count', () => {
    const result = applyLssSensorEffects({
      fields: [field(1, 1, 1, [FieldEffect.DUBIOUS_SPACECRAFT_COUNT])],
      observer: { x: 2, y: 2 },
      position: (entry) => ({ x: entry.x, y: entry.y }),
      signatures: [{ x: 1, y: 1, visibleCount: 7 }],
    });

    expect(result.signatures).toEqual([{ x: 1, y: 1, state: 'DUBIOUS' }]);
    expect(result.signatures[0]).not.toHaveProperty('count');
  });
});
