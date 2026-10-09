import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { AllianceChronicleEventType } from '@swuniverse/shared';
import { randomBytes } from 'node:crypto';
import { BannerImageError, normalizeBannerPng } from './alliance-banner-image';
import { ALLIANCE_ASSET_STORAGE } from './alliance-asset.port';
import type { AllianceAssetStorage } from './alliance-asset.port';
import { mayActOnAlliance } from './alliance-permissions';
import { AllianceRateLimiterService } from './alliance-rate-limiter.service';
import { ALLIANCE_STORE } from './alliance.store';
import type {
  AllianceAssetDeletionRecord,
  AllianceRecord,
  AllianceStore,
} from './alliance.store';

/** Exponential backoff, 1 min doubling up to 1 h. */
const ASSET_DELETION_BACKOFF_MS = (attempts: number): number =>
  Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 3_600_000);

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
  private dispatching = false;

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

    try {
      await this.store.transaction(async (tx) => {
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
        if (alliance.bannerKey) {
          await tx.enqueueAssetDeletion(alliance.bannerKey);
        }
      });
    } catch (error) {
      // The new asset was never referenced: queue it so a failing adapter
      // cannot leave it behind either.
      await this.store.enqueueAssetDeletion(key).catch(() => undefined);
      await this.retryAssetDeletions();
      throw error;
    }
    await this.retryAssetDeletions();
  }

  async remove(actorId: number, allianceId: number): Promise<void> {
    await this.requireRight(actorId, allianceId);
    await this.rateLimiter?.check(actorId, 'banner');
    await this.store.transaction(async (tx) => {
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
      await tx.enqueueAssetDeletion(alliance.bannerKey);
    });
    await this.retryAssetDeletions();
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
   * Executes due deletion tasks. Failures never propagate to the committed
   * change; the task stays with a growing backoff. A missing asset counts as
   * deleted, so repeating the run is harmless.
   */
  async retryAssetDeletions(options: { now?: Date } = {}): Promise<void> {
    let tasks: AllianceAssetDeletionRecord[];
    try {
      tasks = await this.store.claimDueAssetDeletions(
        100,
        options.now ?? new Date(),
        ASSET_DELETION_BACKOFF_MS,
      );
    } catch (error) {
      this.logger.error(
        'Failed to claim banner asset deletions',
        error instanceof Error ? error.stack : error,
      );
      return;
    }
    for (const task of tasks) {
      try {
        await this.assets.delete(task.assetKey);
        await this.store.completeAssetDeletion(task.id);
      } catch (error) {
        this.logger.error(
          `Failed to delete banner asset ${task.assetKey} (attempt ${task.attempts})`,
          error instanceof Error ? error.stack : error,
        );
      }
    }
  }

  @Interval(60_000)
  async dispatchAssetDeletions(): Promise<void> {
    if (this.dispatching) return;
    this.dispatching = true;
    try {
      await this.retryAssetDeletions();
    } finally {
      this.dispatching = false;
    }
  }
}
