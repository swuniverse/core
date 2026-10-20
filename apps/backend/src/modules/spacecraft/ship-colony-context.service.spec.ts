jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../faction/entities/faction.entity', () => ({
  FactionEntity: class FactionEntity {},
}));
jest.mock('../starmap/entities/star-system.entity', () => ({
  StarSystem: class StarSystem {},
}));
jest.mock('../starmap/entities/celestial-object.entity', () => ({
  CelestialObject: class CelestialObject {},
}));
jest.mock('../starmap/entities/layer.entity', () => ({
  Layer: class Layer {},
}));
jest.mock('./entities/spacecraft-module.entity', () => ({
  SpacecraftModule: class SpacecraftModule {},
}));
jest.mock('./entities/fleet.entity', () => ({ Fleet: class Fleet {} }));
jest.mock('../colony/entities/colony-storage.entity', () => ({
  ColonyStorage: class ColonyStorage {},
}));
jest.mock('../colony/entities/crew-assignment.entity', () => ({
  CrewAssignment: class CrewAssignment {},
}));
jest.mock('../colony/colony-crew.service', () => ({
  ColonyCrewService: class ColonyCrewService {},
}));
jest.mock('./spacecraft-torpedo.service', () => ({
  SpacecraftTorpedoService: class SpacecraftTorpedoService {},
}));

jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
}));
jest.mock('../colony/entities/colony-changeable.entity', () => ({
  ColonyChangeable: class ColonyChangeable {},
}));
jest.mock('../colony/entities/crew-assignment.entity', () => ({
  CrewAssignment: class CrewAssignment {},
}));
jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: { IDLE: 'IDLE' },
}));
import { BadRequestException } from '@nestjs/common';
import { calculateTransferEnergyCost } from './transfer-cost';
import { ShipColonyContextService } from './ship-colony-context.service';

describe('transfer energy cost', () => {
  it.each([
    [1, 1],
    [5, 1],
    [6, 2],
    [10, 2],
  ])('charges one EPS per five capacity: %s -> %s', (amount, cost) => {
    expect(calculateTransferEnergyCost(amount)).toBe(cost);
  });
  it('rejects invalid amounts', () => {
    expect(() => calculateTransferEnergyCost(0)).toThrow(BadRequestException);
    expect(() => calculateTransferEnergyCost(1.5)).toThrow(BadRequestException);
  });
});

describe('chargeTransferEnergy', () => {
  const service = new ShipColonyContextService(
    ...(Array(8).fill(undefined) as ConstructorParameters<
      typeof ShipColonyContextService
    >),
  );
  const makeColony = (energy: number) =>
    ({
      changeable: { energy, maxEnergy: 100, workers: 0, workless: 0 },
    }) as never;

  it('charges the ship by default', () => {
    const ship = { energy: 10 } as never as { energy: number };
    const colony = makeColony(50);
    service.chargeTransferEnergy(ship as never, colony, 10);
    expect(ship.energy).toBe(8);
    expect(
      (colony as { changeable: { energy: number } }).changeable.energy,
    ).toBe(50);
  });

  it('charges the colony when it initiates the transfer', () => {
    const ship = { energy: 10 } as never as { energy: number };
    const colony = makeColony(50);
    service.chargeTransferEnergy(ship as never, colony, 10, 'COLONY');
    expect(ship.energy).toBe(10);
    expect(
      (colony as { changeable: { energy: number } }).changeable.energy,
    ).toBe(48);
  });

  it('rejects when the colony lacks energy', () => {
    const ship = { energy: 10 } as never;
    expect(() =>
      service.chargeTransferEnergy(ship, makeColony(1), 10, 'COLONY'),
    ).toThrow('2 colony energy required');
  });
});
