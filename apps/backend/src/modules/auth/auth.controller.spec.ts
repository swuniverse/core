import { NotFoundException } from '@nestjs/common';
import { AuthController } from './auth.controller';

describe('AuthController password reset endpoints', () => {
  it('exposes public feature, lost-password, and reset-password service behavior', async () => {
    const service = {
      features: jest.fn(() => ({ passwordReset: true })),
      lostPassword: jest.fn(async () => ({ message: 'Falls ein Konto existiert, wurde eine E-Mail verschickt' })),
      resetPassword: jest.fn(async () => ({ message: 'Das Passwort wurde geändert' })),
    };
    const controller = new AuthController(service as never);

    expect(controller.features()).toEqual({ passwordReset: true });
    await expect(controller.lostPassword({ login: 'Leia' })).resolves.toEqual({
      message: 'Falls ein Konto existiert, wurde eine E-Mail verschickt',
    });
    await expect(controller.resetPassword({ token: 'x'.repeat(32), password: 'password' })).resolves.toEqual({
      message: 'Das Passwort wurde geändert',
    });
  });

  it('preserves 404 behavior when password reset is disabled', async () => {
    const service = { lostPassword: jest.fn(async () => { throw new NotFoundException(); }) };
    const controller = new AuthController(service as never);
    await expect(controller.lostPassword({ login: 'Leia' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
