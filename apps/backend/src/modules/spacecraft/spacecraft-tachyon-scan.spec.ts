import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';
import { SpacecraftResourceFlowService } from './spacecraft-resource-flow.service';
import { tachyonScanExpiresAt } from './spacecraft-tachyon-scan';

const runtime = new SpacecraftRuntimeStateService();

describe('Gravitationswellenscanner runtime', () => {
  it('requires an installed scanner and preserves the scan timestamp on hydration', () => {
    const ship = {
      locationId: 42,
      runtimeSystems: {},
      modules: [{ category: 'SPECIAL', moduleType: 'Gravitationswellenscanner', isActive: true }],
    };
    const scanner = runtime.initialize(ship as never).TACHYON_SCANNER!;
    Object.assign(scanner, { lastScanAt: 1000, lastScanLocationId: 42 });
    expect(runtime.initialize(ship as never).TACHYON_SCANNER).toBe(scanner);
    expect(tachyonScanExpiresAt(ship as never, 1000)).toBe(301000);
    scanner.active = false;
    expect(tachyonScanExpiresAt(ship as never, 1000)).toBeNull();
    scanner.active = true;
    scanner.integrity = 0;
    expect(tachyonScanExpiresAt(ship as never, 1000)).toBeNull();
    ship.modules = [];
    expect(runtime.initialize(ship as never).TACHYON_SCANNER).toBeUndefined();
    expect(runtime.initialize({ runtimeSystems: {} } as never).TACHYON_SCANNER).toBeUndefined();
  });

  it('uses three EPS per active tick', () => {
    const flow = new SpacecraftResourceFlowService(runtime);
    expect(flow.getSystemCost('TACHYON_SCANNER')).toBe(3);
  });
});
