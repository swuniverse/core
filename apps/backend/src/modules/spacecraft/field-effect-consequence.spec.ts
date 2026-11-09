import { Test } from '@nestjs/testing';
import { FieldEffect } from '@swuniverse/shared';
import { GameGateway } from '../websocket/game.gateway';
import { MessagingService } from '../messaging/messaging.service';
import {
  FieldEffectConsequence,
  STU_CLOCK_TOKEN,
  STU_RANDOM_TOKEN,
} from './field-effect-consequence';
import type { Spacecraft } from './entities/spacecraft.entity';

const field = (...effects: FieldEffect[]) => ({
  fieldType: { effects },
  effects: [],
}) as never;

function ship(): Spacecraft {
  return {
    id: 7,
    userId: 3,
    name: 'Falcon',
    status: 'IDLE' as never,
    warpdrive: 80,
    warpdriveMax: 100,
    reactorFuel: 60,
    reactorFuelMax: 100,
    energy: 50,
    energyMax: 100,
    epsMax: 100,
    shields: 40,
    shieldsMax: 100,
    runtimeSystems: {
      CLOAK: { active: true, cooldown: 0, integrity: 100 },
      EPS: { active: true, cooldown: 0, integrity: 100 },
      REACTOR: { active: true, cooldown: 0, integrity: 100 },
      SHIELDS: { active: true, cooldown: 0, integrity: 100 },
      WARPDRIVE: { active: true, cooldown: 0, integrity: 100 },
      SHORT_RANGE_SENSORS: { active: true, cooldown: 0, integrity: 100 },
    },
  } as unknown as Spacecraft;
}

describe('FieldEffectConsequence', () => {
  it('can be initialized by Nest with default random and clock dependencies', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          FieldEffectConsequence,
          { provide: MessagingService, useValue: {} },
          { provide: GameGateway, useValue: {} },
          { provide: STU_RANDOM_TOKEN, useValue: Math.random },
          { provide: STU_CLOCK_TOKEN, useValue: () => new Date() },
        ],
      }).compile(),
    ).resolves.toBeDefined();
  });

  const now = new Date('2026-10-30T12:00:00Z');
  const messages = { sendSystem: jest.fn() };
  const gateway = { emitToUser: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('applies all entry-only leaks, cloak shutdown and wall-clock sensor cooldown', async () => {
    const consequence = new FieldEffectConsequence(messages as never, gateway as never, () => 0, () => now);
    const target = ship();
    await consequence.onEnterField(target, field(
      FieldEffect.WARPDRIVE_LEAK,
      FieldEffect.REACTOR_LEAK,
      FieldEffect.EPS_LEAK,
      FieldEffect.CLOAK_UNUSEABLE,
      FieldEffect.NFS_MALFUNCTION_COOLDOWN,
    ), []);

    expect(target.warpdrive).toBe(70);
    expect(target.reactorFuel).toBe(55);
    expect(target.energy).toBe(45);
    expect((target.runtimeSystems.CLOAK as { active: boolean }).active).toBe(false);
    expect(target.shortRangeSensorsCooldownUntil).toEqual(new Date('2026-10-30T12:10:00Z'));
    expect(messages.sendSystem).toHaveBeenCalledWith(3, expect.any(String), expect.stringContaining('Falcon'), undefined, 'SHIP');
    expect(gateway.emitToUser).toHaveBeenCalled();
  });

  it('only acts when the field carries an effect and never drops below zero', async () => {
    const consequence = new FieldEffectConsequence(messages as never, gateway as never, () => 0, () => now);
    const target = ship();
    target.reactorFuel = 2;
    target.energy = 2;
    await consequence.onEnterField(target, field(FieldEffect.REACTOR_LEAK, FieldEffect.EPS_LEAK), []);
    expect(target.reactorFuel).toBe(0);
    expect(target.energy).toBe(0);
    const untouched = ship();
    await consequence.onEnterField(untouched, field(), []);
    expect(untouched.warpdrive).toBe(80);
  });

  it('applies shield malfunction on entry and every tick', async () => {
    const consequence = new FieldEffectConsequence(messages as never, gateway as never, () => 0, () => now);
    const target = ship();
    await consequence.onEnterField(target, field(FieldEffect.SHIELD_MALFUNCTION), []);
    expect(target.shields).toBe(35);
    expect((target.runtimeSystems.SHIELDS as { active: boolean }).active).toBe(false);
    await consequence.onTick(target, field(FieldEffect.SHIELD_MALFUNCTION));
    expect(target.shields).toBe(30);
  });

  it('regenerates a healthy present system on entry and tick with deterministic random', async () => {
    const values = [0.1, 0, 0.49, 0.1, 0, 0.49];
    const consequence = new FieldEffectConsequence(messages as never, gateway as never, () => values.shift() ?? 0, () => now);
    const target = ship();
    await consequence.onEnterField(target, field(FieldEffect.REGENERATION_CHANCE), []);
    expect(target.energy).toBe(60);
    await consequence.onTick(target, field(FieldEffect.REGENERATION_CHANCE));
    expect(target.energy).toBe(70);
  });
});
