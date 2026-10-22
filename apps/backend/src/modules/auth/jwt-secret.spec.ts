import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getJwtSecret } from './jwt-secret';

describe('getJwtSecret', () => {
  afterEach(() => jest.restoreAllMocks());

  it('rejects production startup without JWT_SECRET', () => {
    const config = { get: jest.fn((key: string) => key === 'NODE_ENV' ? 'production' : undefined) } as unknown as ConfigService;

    expect(() => getJwtSecret(config)).toThrow(
      'JWT_SECRET is required when NODE_ENV=production',
    );
  });

  it('uses and warns about the development default outside production', () => {
    const warning = jest.spyOn(Logger, 'warn').mockImplementation();
    const config = { get: jest.fn((key: string) => key === 'NODE_ENV' ? 'test' : undefined) } as unknown as ConfigService;

    expect(getJwtSecret(config)).toBe('swu-development-jwt-secret');
    expect(warning).toHaveBeenCalledWith(
      'JWT_SECRET is not configured; using the development default',
      'JwtSecret',
    );
  });
});
