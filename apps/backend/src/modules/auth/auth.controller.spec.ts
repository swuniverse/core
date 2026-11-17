import { BadRequestException } from '@nestjs/common';
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

  it('propagates invalid reset token errors', async () => {
    const service = { resetPassword: jest.fn(async () => { throw new BadRequestException('Invalid token'); }) };
    const controller = new AuthController(service as never);
    await expect(controller.resetPassword({ token: 'invalid', password: 'password' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
