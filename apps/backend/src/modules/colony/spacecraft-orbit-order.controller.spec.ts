import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { SpacecraftOrbitOrderController } from './spacecraft-orbit-order.controller';

describe('SpacecraftOrbitOrderController', () => {
  function createController() {
    const orbit = {
      startOrbitOrder: jest.fn(async () => ({ order: null, message: '' })),
      stopOrbitOrder: jest.fn(async () => ({ cleared: false })),
    };
    return {
      controller: new SpacecraftOrbitOrderController(orbit as never),
      orbit,
    };
  }

  it('exposes the canonical ship-based routes', () => {
    const prototype = SpacecraftOrbitOrderController.prototype;
    expect(Reflect.getMetadata(PATH_METADATA, SpacecraftOrbitOrderController)).toBe('spacecraft');
    expect(Reflect.getMetadata(PATH_METADATA, prototype.start)).toBe(':id/orbit-order');
    expect(Reflect.getMetadata(METHOD_METADATA, prototype.start)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(PATH_METADATA, prototype.stop)).toBe(':id/orbit-order');
    expect(Reflect.getMetadata(METHOD_METADATA, prototype.stop)).toBe(RequestMethod.DELETE);
  });

  it('delegates with the authenticated actor', async () => {
    const { controller, orbit } = createController();
    const request = { user: { sub: 17 } };

    await controller.start(4, request, { mode: 'BLOCKADE' as never });
    await controller.stop(4, request);

    expect(orbit.startOrbitOrder).toHaveBeenCalledWith(4, 17, 'BLOCKADE');
    expect(orbit.stopOrbitOrder).toHaveBeenCalledWith(4, 17);
  });

  it('accepts only defend and blockade modes', async () => {
    const dtoType = Reflect.getMetadata(
      'design:paramtypes',
      SpacecraftOrbitOrderController.prototype,
      'start',
    )[2];
    for (const mode of ['DEFEND', 'BLOCKADE']) {
      await expect(validate(plainToInstance(dtoType, { mode }))).resolves.toHaveLength(0);
    }
    for (const mode of ['INVASION', '', undefined]) {
      expect(await validate(plainToInstance(dtoType, { mode }))).not.toHaveLength(0);
    }
  });
});
