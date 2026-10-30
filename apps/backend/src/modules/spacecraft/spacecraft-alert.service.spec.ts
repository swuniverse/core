jest.mock('./entities/spacecraft.entity', () => ({
  AlertState: { GREEN: 'GREEN', YELLOW: 'YELLOW', RED: 'RED' },
  SpacecraftOperatingMode: { NORMAL: 'NORMAL', STANDBY: 'STANDBY' },
  Spacecraft: class Spacecraft {},
}));

import { AlertState } from './entities/spacecraft.entity';
import { SpacecraftAlertService } from './spacecraft-alert.service';

describe('SpacecraftAlertService cloak', () => {
  const run = (alertState: AlertState, cloakActive: boolean) => {
    const ship = {
      alertState: AlertState.GREEN,
      runtimeSystems: {
        CLOAK: { active: cloakActive, cooldown: 0, integrity: 100 },
        SHIELDS: { active: false, cooldown: 0, integrity: 100 },
      },
    } as never as { runtimeSystems: Record<string, { active: boolean }> };
    const runtime = { initialize: jest.fn((s) => s.runtimeSystems) };
    const result = new SpacecraftAlertService(runtime as never).apply(
      ship as never,
      alertState,
    );
    return { ship, result };
  };

  it('uncloaks on red alert', () => {
    const { ship, result } = run(AlertState.RED, true);
    expect(ship.runtimeSystems.CLOAK.active).toBe(false);
    expect(ship.runtimeSystems.SHIELDS.active).toBe(true);
    expect(result.messages).toContain('Tarnung deaktiviert');
  });

  it('keeps an active cloak on yellow and green alert', () => {
    expect(run(AlertState.YELLOW, true).ship.runtimeSystems.CLOAK.active).toBe(true);
    expect(run(AlertState.GREEN, true).ship.runtimeSystems.CLOAK.active).toBe(true);
  });
});
