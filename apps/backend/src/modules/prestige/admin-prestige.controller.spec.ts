import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AdminGuard } from '../auth/admin.guard';
import { AdminPrestigeController } from './admin-prestige.controller';
import { AdminPrestigeCorrectionDto } from './admin-prestige.dto';

function setup(user: { id: number; isNpc: boolean; prestige: number } | null) {
  const manager = { findOne: jest.fn(async () => user) };
  const order: string[] = [];
  const dataSource = {
    transaction: jest.fn(async (work: (m: unknown) => unknown) => {
      const result = await work(manager);
      order.push('commit');
      return result;
    }),
  };
  const prestige = { change: jest.fn(async () => undefined) };
  const messaging = {
    sendSystem: jest.fn(async () => {
      order.push('message');
    }),
  };
  const controller = new AdminPrestigeController(
    dataSource as never,
    prestige as never,
    messaging as never,
  );
  return { controller, manager, prestige, messaging, order };
}

describe('AdminPrestigeController', () => {
  it('is restricted to admins', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AdminPrestigeController);
    expect(guards).toContain(AdminGuard);
  });

  it('books the signed amount with the description and notifies after commit', async () => {
    const { controller, manager, prestige, messaging, order } = setup({
      id: 12,
      isNpc: false,
      prestige: 100,
    });

    await expect(
      controller.correct({ playerId: 12, amount: -25, description: 'Bugausnutzung' }),
    ).resolves.toEqual({ playerId: 12, prestige: 75 });

    expect(prestige.change).toHaveBeenCalledWith(12, -25, 'Bugausnutzung', manager);
    expect(messaging.sendSystem).toHaveBeenCalledWith(
      12,
      'Dein Prestige wurde von der Spielleitung um -25 geändert.\nGrund: Bugausnutzung',
    );
    expect(order).toEqual(['commit', 'message']);
  });

  it('rejects unknown players and NPC accounts without booking', async () => {
    const missing = setup(null);
    await expect(
      missing.controller.correct({ playerId: 5, amount: 5, description: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    const npc = setup({ id: 9, isNpc: true, prestige: 0 });
    await expect(
      npc.controller.correct({ playerId: 9, amount: 5, description: 'x' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(npc.prestige.change).not.toHaveBeenCalled();
    expect(npc.messaging.sendSystem).not.toHaveBeenCalled();
  });

  it('requires a non-zero integer amount and a description', () => {
    const errors = (body: object) =>
      validateSync(plainToInstance(AdminPrestigeCorrectionDto, body)).map(
        (error) => error.property,
      );
    expect(errors({ playerId: 1, amount: 10, description: 'ok' })).toEqual([]);
    expect(errors({ playerId: 1, amount: 0, description: 'ok' })).toEqual(['amount']);
    expect(errors({ playerId: 1, amount: 1.5, description: 'ok' })).toEqual(['amount']);
    expect(errors({ playerId: 1, amount: 3, description: '   ' })).toEqual(['description']);
  });
});
