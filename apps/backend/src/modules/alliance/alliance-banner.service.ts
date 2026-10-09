import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AllianceChronicleEventType } from '@swuniverse/shared';
import { randomBytes } from 'node:crypto';
import { BannerImageError, normalizeBannerPng } from './alliance-banner-image';
import { ALLIANCE_ASSET_STORAGE } from './alliance-asset.port';
import type { AllianceAssetStorage } from './alliance-asset.port';
import { mayActOnAlliance } from './alliance-permissions';
import { AllianceRateLimiterService } from './alliance-rate-limiter.service';
import { ALLIANCE_STORE } from './alliance.store';
import type { AllianceRecord, AllianceStore } from './alliance.store';

const ERR = {
  allianceNotFound: 'Die Allianz existiert nicht',
  bannerNotFound: 'Die Allianz hat kein Banner',
  forbidden: 'Dazu fehlt Dir die Berechtigung',
  noFile: 'Bitte wähle eine PNG-Datei aus',
} as const;

/**
 * Upload, replacement, removal and delivery of alliance banners. Rights are
 * decided here from the stored membership, files are validated by content and
 * re-encoded, and the bytes live behind {@link AllianceAssetStorage}.
 */
@Injectable()
export class AllianceBannerService {
  private readonly logger = new Logger(AllianceBannerService.name);

  constructor(
    @Inject(ALLIANCE_STORE) private readonly store: AllianceStore,
    @Inject(ALLIANCE_ASSET_STORAGE)
    private readonly assets: AllianceAssetStorage,
    @Optional() private readonly rateLimiter?: AllianceRateLimiterService,
  ) {}

  /** Sets or replaces the banner. The new asset is stored before the reference. */
  async upload(
    actorId: number,
    allianceId: number,
    file: Buffer | undefined,
  ): Promise<void> {
    await this.requireRight(actorId, allianceId);
    await this.rateLimiter?.check(actorId, 'banner');
    if (!file || file.length === 0) throw new BadRequestException(ERR.noFile);
    const image = this.validated(file);

    const key = randomBytes(16).toString('hex');
    await this.assets.save(key, image.data);

    let previousKey: string | null;
    try {
      previousKey = await this.store.transaction(async (tx) => {
        const alliance = await this.lockedAllianceWithRight(
          tx,
          actorId,
          allianceId,
        );
        await tx.updateAlliance(allianceId, {
          bannerKey: key,
          bannerUpdatedAt: new Date(),
        });
        await this.appendChronicle(
          tx,
          allianceId,
          AllianceChronicleEventType.BANNER_SET,
          actorId,
          {
            width: image.width,
            height: image.height,
            replaced: alliance.bannerKey !== null,
          },
        );
        return alliance.bannerKey;
      });
    } catch (error) {
      await this.deleteQuietly(key);
      throw error;
    }
    if (previousKey) await this.deleteQuietly(previousKey);
  }

  async remove(actorId: number, allianceId: number): Promise<void> {
    await this.requireRight(actorId, allianceId);
    await this.rateLimiter?.check(actorId, 'banner');
    const previousKey = await this.store.transaction(async (tx) => {
      const alliance = await this.lockedAllianceWithRight(
        tx,
        actorId,
        allianceId,
      );
      if (!alliance.bannerKey) throw new BadRequestException(ERR.bannerNotFound);
      await tx.updateAlliance(allianceId, {
        bannerKey: null,
        bannerUpdatedAt: null,
      });
      await this.appendChronicle(
        tx,
        allianceId,
        AllianceChronicleEventType.BANNER_REMOVED,
        actorId,
        null,
      );
      return alliance.bannerKey;
    });
    await this.deleteQuietly(previousKey);
  }

  /** Public: alliance pages are public, so no membership is required. */
  async read(allianceId: number): Promise<Buffer> {
    const alliance = await this.store.findAlliance(allianceId);
    const data = alliance?.bannerKey
      ? await this.assets.read(alliance.bannerKey)
      : null;
    if (!data) throw new NotFoundException(ERR.bannerNotFound);
    return data;
  }

  private validated(file: Buffer) {
    try {
      return normalizeBannerPng(file);
    } catch (error) {
      if (error instanceof BannerImageError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /** Cheap pre-check so that foreign or unauthorised callers cost nothing. */
  private async requireRight(
    actorId: number,
    allianceId: number,
  ): Promise<void> {
    if (!(await this.store.findAlliance(allianceId))) {
      throw new NotFoundException(ERR.allianceNotFound);
    }
    const membership = await this.store.findMembership(actorId);
    if (
      !membership ||
      membership.allianceId !== allianceId ||
      !mayActOnAlliance(membership.role, 'manageBanner')
    ) {
      throw new ForbiddenException(ERR.forbidden);
    }
  }

  private async lockedAllianceWithRight(
    tx: AllianceStore,
    actorId: number,
    allianceId: number,
  ): Promise<AllianceRecord> {
    const alliance = await tx.lockAlliance(allianceId);
    if (!alliance) throw new NotFoundException(ERR.allianceNotFound);
    const membership = await tx.findMembership(actorId);
    if (
      !membership ||
      membership.allianceId !== allianceId ||
      !mayActOnAlliance(membership.role, 'manageBanner')
    ) {
      throw new ForbiddenException(ERR.forbidden);
    }
    return alliance;
  }

  private async appendChronicle(
    tx: AllianceStore,
    allianceId: number,
    eventType: AllianceChronicleEventType,
    actorId: number,
    metadata: Record<string, unknown> | null,
  ): Promise<void> {
    const actor = await tx.findPlayer(actorId);
    await tx.appendAllianceChronicleEntry({
      allianceId,
      eventType,
      actorUserId: actor?.id ?? null,
      actorName: actor?.name ?? null,
      subjectUserId: null,
      subjectName: null,
      metadata,
    });
  }

  /**
   * A committed change stays successful when the file cannot be removed now;
   * a leftover file is unreferenced and harmless (durable retry is a
   * separate follow-up).
   */
  private async deleteQuietly(key: string): Promise<void> {
    try {
      await this.assets.delete(key);
    } catch (error) {
      this.logger.error(
        `Failed to delete banner asset ${key}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
