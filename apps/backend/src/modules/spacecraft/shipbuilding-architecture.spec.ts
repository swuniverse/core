import { readFileSync } from 'fs';
import { join } from 'path';

// Composition is itself an acceptance seam: both adapters must use one leaf module.
describe('shipbuilding module composition', () => {
  it('gives colony and station adapters the same authoritative core without new cycle workarounds', () => {
    const root = join(__dirname, '..');
    for (const file of [
      'colony/colony.module.ts',
      'spacecraft/spacecraft.module.ts',
    ]) {
      const source = readFileSync(join(root, file), 'utf8');
      expect(source).toContain('ShipbuildingModule,');
      expect(source).not.toMatch(/^\s+ShipbuildingCoreService,/m);
    }
    const coreModule = readFileSync(
      join(root, 'shipbuilding/shipbuilding.module.ts'),
      'utf8',
    );
    expect(coreModule).not.toMatch(
      /forwardRef|ModuleRef|ColonyModule|SpacecraftFeatureModule/,
    );
    for (const file of [
      'colony/colony-shipyard.service.ts',
      'spacecraft/station-shipyard.service.ts',
    ]) {
      const adapter = readFileSync(join(root, file), 'utf8');
      expect(adapter).toContain('this.core.startBuild(');
      expect(adapter).toContain('this.core.completeBuild(');
    }
    const controller = readFileSync(
      join(root, 'spacecraft/spacecraft.controller.ts'),
      'utf8',
    );
    expect(controller).not.toContain('ColonyShipyardService');
  });
});
