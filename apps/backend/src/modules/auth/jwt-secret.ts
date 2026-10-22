import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEVELOPMENT_JWT_SECRET = 'swu-development-jwt-secret';

export function getJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (secret) return secret;

  if (config.get<string>('NODE_ENV') === 'production') {
    throw new Error('JWT_SECRET is required when NODE_ENV=production');
  }

  Logger.warn(
    'JWT_SECRET is not configured; using the development default',
    'JwtSecret',
  );
  return DEVELOPMENT_JWT_SECRET;
}
