import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  ResourceConversionController,
  ResourceConversionSelection,
} from './resource-conversion.controller';
import { ResourceConversionService } from './resource-conversion.service';
import { Spacecraft } from './entities/spacecraft.entity';
import { initializeSpacecraftRuntimeSystems } from './spacecraft-runtime-state.service';

describe('Resource conversion API and runtime', () => {
  it.each([0, -1, 1.5, '63', null, 2147483648])(
    'rejects invalid commodity ID %j',
    async (commodityId) => {
      expect(
        await validate(
          plainToInstance(ResourceConversionSelection, { commodityId }),
        ),
      ).not.toHaveLength(0);
    },
  );
  it('requires authentication and passes the authenticated owner for every action', async () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, ResourceConversionController),
    ).toHaveLength(1);
    const service = { get: jest.fn(), select: jest.fn() };
    const controller = new ResourceConversionController(
      service as unknown as ResourceConversionService,
    );
    const request = { user: { sub: 17 } };
    controller.get(9, request);
    controller.select(9, request, { commodityId: 63 });
    controller.stop(9, request);
    expect(service.get).toHaveBeenCalledWith(9, 17);
    expect(service.select.mock.calls).toEqual([
      [9, 17, 63],
      [9, 17, null],
    ]);
  });
  it('starts inactive only with an installed refinery and never fabricates a legacy capability', () => {
    const ship = {
      runtimeSystems: {},
      modules: [
        {
          category: 'SPECIAL',
          moduleType: 'Molekular-Raffinerie',
          integrity: 100,
          isActive: true,
        },
      ],
    } as Spacecraft;
    expect(
      initializeSpacecraftRuntimeSystems(ship).RESOURCE_CONVERTER?.active,
    ).toBe(false);
    ship.modules = [];
    expect(
      initializeSpacecraftRuntimeSystems(ship).RESOURCE_CONVERTER,
    ).toBeUndefined();
    const legacy = { runtimeSystems: {} } as Spacecraft;
    expect(
      initializeSpacecraftRuntimeSystems(legacy).RESOURCE_CONVERTER,
    ).toBeUndefined();
  });
});
