jest.mock('./starmap.service', () => ({
  StarmapService: class StarmapService {},
}));
jest.mock('./starmap-admin.service', () => ({
  StarmapAdminService: class StarmapAdminService {},
}));
jest.mock('./starmap-query.service', () => ({
  StarmapQueryService: class StarmapQueryService {},
}));
jest.mock('./exploration.service', () => ({
  ExplorationService: class ExplorationService {},
}));
jest.mock('./influence.service', () => ({
  InfluenceService: class InfluenceService {},
}));
jest.mock('./wormhole.service', () => ({
  WormholeService: class WormholeService {},
}));

import { NotFoundException } from '@nestjs/common';
import { StarmapController } from './starmap.controller';

describe('StarmapController system-entry access', () => {
  function createController(explored = false) {
    const starmapService = {
      getSystemDetail: jest.fn().mockResolvedValue({ id: 9 }),
      getSystemsInLayer: jest.fn().mockResolvedValue([{ id: 9 }, { id: 10 }]),
      getExploredSystemsInLayer: jest.fn().mockResolvedValue([{ id: 9 }]),
    };
    const starmapQueryService = { getSystemGrid: jest.fn().mockResolvedValue({ system: { id: 9 } }) };
    const explorationService = { isSystemExplored: jest.fn().mockResolvedValue(explored) };
    return {
      starmapService,
      starmapQueryService,
      explorationService,
      controller: new StarmapController(
        starmapService as any,
        {} as any,
        starmapQueryService as any,
        explorationService as any,
        {} as any,
        {} as any,
      ),
    };
  }

  it('treats an undiscovered player system detail and grid request as absent', async () => {
    const { controller, starmapService, starmapQueryService, explorationService } = createController();
    const req = { user: { sub: 42 } };

    await expect(controller.getSystemDetail(9, req)).rejects.toThrow(NotFoundException);
    await expect(controller.getSystemGrid(9, req)).rejects.toThrow(NotFoundException);
    expect(explorationService.isSystemExplored).toHaveBeenCalledWith(42, 9);
    expect(starmapService.getSystemDetail).not.toHaveBeenCalled();
    expect(starmapQueryService.getSystemGrid).not.toHaveBeenCalled();
  });

  it('returns only personally discovered systems to players but preserves full map-editor lists', async () => {
    const player = createController();
    await expect(
      player.controller.getSystemsInLayer(3, { user: { sub: 42 } }),
    ).resolves.toEqual([{ id: 9 }]);
    expect(player.starmapService.getExploredSystemsInLayer).toHaveBeenCalledWith(
      42,
      3,
      player.explorationService,
    );
    expect(player.starmapService.getSystemsInLayer).not.toHaveBeenCalled();

    const editor = createController();
    await expect(
      editor.controller.getSystemsInLayer(3, {
        user: { sub: 99, permissions: ['MAP_EDITOR'] },
      }),
    ).resolves.toEqual([{ id: 9 }, { id: 10 }]);
    expect(editor.starmapService.getSystemsInLayer).toHaveBeenCalledWith(3);
    expect(editor.starmapService.getExploredSystemsInLayer).not.toHaveBeenCalled();
  });

  it('allows a discovered player and privileged map users to inspect a system', async () => {
    const discovered = createController(true);
    await expect(
      discovered.controller.getSystemDetail(9, { user: { sub: 42 } }),
    ).resolves.toEqual({ id: 9 });

    const editor = createController(false);
    await expect(
      editor.controller.getSystemGrid(9, {
        user: { sub: 99, permissions: ['MAP_EDITOR'] },
      }),
    ).resolves.toEqual({ system: { id: 9 } });
    expect(editor.explorationService.isSystemExplored).not.toHaveBeenCalled();
  });
});
