import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Explicit rollout gate for the alliance infrastructure (alliance and shared
 * partner ships on the starmap). Defaults to disabled so the starmap ship layer
 * can ship with own ships only until the stage is fully delivered.
 */
@Injectable()
export class AllianceInfrastructureCapabilityService {
  readonly enabled: boolean;

  constructor(config: ConfigService) {
    this.enabled =
      config.get<string>('ALLIANCE_INFRASTRUCTURE_ENABLED') === 'true';
  }
}
