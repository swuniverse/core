import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Explicit rollout gate for the diplomacy core. It defaults to disabled so
 * schema migrations can be deployed safely before behavior is exposed.
 */
@Injectable()
export class DiplomacyCapabilityService {
  readonly enabled: boolean;

  constructor(config: ConfigService) {
    this.enabled = config.get<string>('DIPLOMACY_CORE_ENABLED') === 'true';
  }
}
