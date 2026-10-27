import { FlightConsequencePipeline } from './flight-consequence-pipeline';
import type { Spacecraft } from './entities/spacecraft.entity';

describe('FlightConsequencePipeline', () => {
  const field = { id: 7, effects: ['EPS_LEAK'] } as never;

  it('runs registered consequences in order and collects messages', async () => {
    const ship = { status: 'IDLE' } as Spacecraft;
    const calls: string[] = [];
    const pipeline = new FlightConsequencePipeline([
      {
        onEnterField: async (_ship, _field, messages) => {
          calls.push('first');
          messages.push('Energie wird abgeleitet');
        },
        onTick: async () => undefined,
      },
      {
        onEnterField: async () => {
          calls.push('second');
        },
        onTick: async () => undefined,
      },
    ]);

    await expect(pipeline.onEnterField(ship, field)).resolves.toEqual([
      'Energie wird abgeleitet',
    ]);
    expect(calls).toEqual(['first', 'second']);
  });

  it('stops after a consequence destroys the spacecraft', async () => {
    const ship = { status: 'IDLE' } as Spacecraft;
    const later = jest.fn();
    const pipeline = new FlightConsequencePipeline([
      {
        onEnterField: async (current) => {
          current.status = 'DESTROYED' as Spacecraft['status'];
        },
        onTick: async () => undefined,
      },
      { onEnterField: later, onTick: async () => undefined },
    ]);

    await pipeline.onEnterField(ship, field);

    expect(later).not.toHaveBeenCalled();
  });

  it('runs tick hooks until destruction', async () => {
    const ship = { status: 'IDLE' } as Spacecraft;
    const tick = jest.fn(async () => undefined);
    const pipeline = new FlightConsequencePipeline([
      { onEnterField: async () => undefined, onTick: tick },
    ]);

    await pipeline.onTick(ship, field);

    expect(tick).toHaveBeenCalledWith(ship, field);
  });
});
