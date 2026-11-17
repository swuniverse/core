import {
  applyRepairStep,
  estimateRepairSteps,
  mayRepairShips,
  planRepairStep,
  requiredSelfRepairWorkbees,
  SPARE_PARTS_ID,
  SYSTEM_COMPONENTS_ID,
  needsRepair,
} from './station-repair-plan';
import type { StationRole } from './entities/spacecraft.entity';
import type { SpacecraftModule } from './entities/spacecraft-module.entity';

const damaged = (id: number, integrity = 100): SpacecraftModule =>
  ({ id, integrity, isActive: true, cooldown: 0 }) as SpacecraftModule;

describe('station repair plan', () => {
  it('includes the built-in beamblocker in the two-system budget and restores its destroyed default mode', () => {
    const beam = { active: false, cooldown: 0, integrity: 0 };
    const station = { kind: 'STATION', crew: 1, hull: 1000, hullMax: 1000, runtimeSystems: { BEAM_BLOCKER: beam } };
    const modules = [damaged(1, 20), damaged(2, 50)];
    expect(needsRepair(station, [])).toBe(true);
    expect(estimateRepairSteps(station, modules)).toBe(2);
    const first = planRepairStep(station, modules);
    expect(first.beamBlocker).toBeUndefined();
    applyRepairStep(station, first);
    const second = planRepairStep(station, modules);
    expect(second.costs).toEqual([
      { commodityId: SPARE_PARTS_ID, amount: 1 },
      { commodityId: SYSTEM_COMPONENTS_ID, amount: 1 },
    ]);
    applyRepairStep(station, second);
    expect(beam).toMatchObject({ active: true, integrity: 100 });
    expect(needsRepair(station, modules)).toBe(false);
    beam.integrity = 50;
    beam.active = false;
    applyRepairStep(station, planRepairStep(station, modules));
    expect(beam).toMatchObject({ active: true, integrity: 100 });
    station.crew = 0;
    beam.integrity = 0;
    beam.active = false;
    applyRepairStep(station, planRepairStep(station, modules));
    expect(beam).toMatchObject({ active: false, integrity: 100 });
    expect(needsRepair(station, [])).toBe(false);
  });
  it('restores 100 hull and two damaged systems per step for one spare part and one component', () => {
    const modules = [damaged(1, 20), damaged(2, 50), damaged(3, 10), damaged(4)];
    const ship = { hull: 150, hullMax: 1000 };
    const step = planRepairStep(ship, modules);
    expect(step.modules.map((entry) => entry.id)).toEqual([1, 2]);
    expect(step.costs).toEqual([
      { commodityId: SPARE_PARTS_ID, amount: 1 },
      { commodityId: SYSTEM_COMPONENTS_ID, amount: 1 },
    ]);
    applyRepairStep(ship, step);
    expect(ship.hull).toBe(250);
    expect(modules.map((entry) => entry.integrity)).toEqual([100, 100, 10, 100]);
  });

  it('charges only spare parts for hull damage and clamps to the maximum', () => {
    const ship = { hull: 950, hullMax: 1000 };
    const step = planRepairStep(ship, [damaged(1)]);
    expect(step.costs).toEqual([{ commodityId: SPARE_PARTS_ID, amount: 1 }]);
    applyRepairStep(ship, step);
    expect(ship.hull).toBe(1000);
  });

  it('treats inactive or cooling modules as damaged and estimates the steps', () => {
    const inactive = { ...damaged(1), isActive: false } as SpacecraftModule;
    expect(planRepairStep({ hull: 10, hullMax: 10 }, [inactive]).modules).toHaveLength(1);
    expect(estimateRepairSteps({ hull: 0, hullMax: 250 }, [damaged(1, 1), damaged(2, 1), damaged(3, 1)])).toBe(3);
  });

  it('allows ship repair only at shipyards and bases and derives the workbee need', () => {
    expect(mayRepairShips('SHIPYARD' as StationRole)).toBe(true);
    expect(mayRepairShips('BASE' as StationRole)).toBe(true);
    expect(mayRepairShips('OUTPOST' as StationRole)).toBe(false);
    expect(requiredSelfRepairWorkbees('BASE' as StationRole)).toBe(8);
    expect(requiredSelfRepairWorkbees('SHIPYARD' as StationRole)).toBe(2);
  });
});
