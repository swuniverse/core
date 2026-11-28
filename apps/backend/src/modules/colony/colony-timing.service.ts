import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

/** Award `HULL_INSPECTOR_*` (Werft Inspektor): ship build and repair times −10 %. */
export const SHIP_WORK_TIME_AWARD_PREFIX = 'HULL_INSPECTOR_';
export const SHIP_WORK_TIME_FACTOR = 0.9;

@Injectable()
export class ColonyTimingService {
  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

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

  /** Player-specific factor for ship build and repair durations (awards). */
  async shipWorkTimeFactor(userId: number | null | undefined): Promise<number> {
    if (userId == null || !this.dataSource) return 1;
    const rows: unknown[] = await this.dataSource.query(
      `SELECT 1 FROM "user_awards" WHERE "userId" = $1 AND "awardKey" LIKE $2 LIMIT 1`,
      [userId, `${SHIP_WORK_TIME_AWARD_PREFIX}%`],
    );
    return rows.length > 0 ? SHIP_WORK_TIME_FACTOR : 1;
  }

  async dateAfterShipWorkSeconds(userId: number | null | undefined, seconds: number): Promise<Date> {
    return this.dateAfterScaledSeconds(seconds * (await this.shipWorkTimeFactor(userId)));
  }
}
