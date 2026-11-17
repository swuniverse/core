import { BadRequestException } from '@nestjs/common';
import { TickController } from './tick.controller';

describe('TickController', () => {
  it('offers an explicit read-only idle user preview', async () => {
    const preview = jest.fn(async () => 'Trockenlauf: 1 Warnungen, 2 Löschungen');
    const controller = new TickController({} as never, {} as never, { preview } as never);
    await expect(controller.previewIdleUsers()).resolves.toEqual({ summary: 'Trockenlauf: 1 Warnungen, 2 Löschungen' });
    expect(preview).toHaveBeenCalledWith(expect.any(Date));
  });
  it('no longer knows the removed warp arrival run (sc-WP-NAV-3b)', () => {
    const run = jest.fn();
    const controller = new TickController({} as never, { run } as never, {} as never);

    expect(() => controller.run('WARP_ARRIVAL')).toThrow(BadRequestException);
    controller.run('MAIN');
    expect(run).toHaveBeenCalledWith('MAIN');
    expect(run).toHaveBeenCalledTimes(1);
  });
});
