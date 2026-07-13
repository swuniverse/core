import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ColonyTimingService {
  constructor(private readonly config: ConfigService) {}

  dateAfterScaledSeconds(seconds: number): Date {
    return new Date(Date.now() + this.scaleBuildTimeSeconds(seconds) * 1000);
  }

  dateAfterScaledMinutes(minutes: number): Date {
    return this.dateAfterScaledSeconds(minutes * 60);
  }

  scaleBuildTimeSeconds(seconds: number): number {
    const configured = Number(this.config.get('GAME_BUILD_TIME_MULTIPLIER'));
    const multiplier =
      Number.isFinite(configured) && configured > 0 ? configured : 1;
    return Math.max(1, Math.round(seconds * multiplier));
  }
}
