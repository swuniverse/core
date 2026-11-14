import { BadRequestException } from '@nestjs/common';
import { TickController } from './tick.controller';

describe('TickController', () => {
  it('no longer knows the removed warp arrival run (sc-WP-NAV-3b)', () => {
    const run = jest.fn();
    const controller = new TickController({} as never, { run } as never);

    expect(() => controller.run('WARP_ARRIVAL')).toThrow(BadRequestException);
    controller.run('MAIN');
    expect(run).toHaveBeenCalledWith('MAIN');
    expect(run).toHaveBeenCalledTimes(1);
  });
});
