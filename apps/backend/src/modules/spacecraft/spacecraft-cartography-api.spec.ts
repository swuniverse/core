jest.mock('./spacecraft.service', () => ({
  SpacecraftService: class SpacecraftService {},
}));
jest.mock('./transfer.service', () => ({
  TransferService: class TransferService {},
}));
jest.mock('./spacecraft-scan.service', () => ({
  SpacecraftScanService: class SpacecraftScanService {},
}));
jest.mock('./starmap-visibility.service', () => ({
  StarmapVisibilityService: class StarmapVisibilityService {},
}));
jest.mock('../game-data/game-data.service', () => ({
  GameDataService: class GameDataService {},
}));
jest.mock('../colonization/colonization.service', () => ({
  ColonizationService: class ColonizationService {},
}));
jest.mock('./ship-colony-context.service', () => ({
  ShipColonyContextService: class ShipColonyContextService {},
}));
jest.mock('./spacecraft-communication.service', () => ({
  SpacecraftCommunicationService: class SpacecraftCommunicationService {},
}));
jest.mock('./spacecraft-engineering.service', () => ({
  SpacecraftEngineeringService: class SpacecraftEngineeringService {},
}));
jest.mock('./spacecraft-destruction.service', () => ({
  SpacecraftDestructionService: class SpacecraftDestructionService {},
}));
jest.mock('./entities/spacecraft.entity', () => ({
  AlertState: { GREEN: 'GREEN' },
  SpacecraftOperatingMode: { NORMAL: 'NORMAL' },
  SpacecraftLssMode: { DISABLED: 'DISABLED' },
}));

import { SpacecraftController } from './spacecraft.controller';

describe('SpacecraftController cartography API contract', () => {
  function createController() {
    const service = {
      getCartography: jest.fn(),
      createCartographyPlan: jest.fn(),
      startCartographyFinalization: jest.fn(),
    };
    const controller = new SpacecraftController(
      service as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { controller, service };
  }

  it('uses the authenticated owner for every canonical cartography operation', async () => {
    const { controller, service } = createController();
    const request = { user: { sub: 17 } };
    const response = { setHeader: jest.fn() };
    service.getCartography.mockResolvedValue({ status: 'PLANNED' });
    service.createCartographyPlan.mockResolvedValue({ status: 'PLANNED' });
    service.startCartographyFinalization.mockResolvedValue({
      status: 'FINISHING',
    });

    await expect(
      controller.getCartography(4, request, response),
    ).resolves.toEqual({
      status: 'PLANNED',
    });
    await expect(controller.createCartographyPlan(4, request)).resolves.toEqual(
      {
        status: 'PLANNED',
      },
    );
    await expect(
      controller.startCartographyFinalization(4, request),
    ).resolves.toEqual({
      status: 'FINISHING',
    });

    expect(service.getCartography).toHaveBeenCalledWith(4, 17);
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store',
    );
    expect(service.createCartographyPlan).toHaveBeenCalledWith(4, 17);
    expect(service.startCartographyFinalization).toHaveBeenCalledWith(4, 17);
  });

  it('has no legacy astrometry or binary survey controller operation', () => {
    const prototype = SpacecraftController.prototype as unknown as Record<string, unknown>;

    expect(prototype).not.toHaveProperty('startAstrometry');
    expect(prototype).not.toHaveProperty('getAstrometry');
    expect(prototype).not.toHaveProperty('surveyCartography');
  });
});
