import { Inject, Injectable } from '@nestjs/common';
import { ALLIANCE_ASSET_STORAGE } from './alliance-asset.port';
import type { AllianceAssetStorage } from './alliance-asset.port';
import {
  ALLIANCE_CONTEXT_CLEANUP,
  AllianceContextCleanup,
} from './alliance-context-cleanup';
import { ALLIANCE_STORE } from './alliance.store';
import type { AllianceStore } from './alliance.store';

/**
 * Internal operation "clean up all alliance data" for a future full game
 * reset. There is deliberately no endpoint: the reset caller is an
 * integration point that does not exist yet.
 *
 * Order matters for repeatability. The relational purge and the consumer
 * notification are one transaction. Asset files go afterwards by listing the
 * storage (not by reading references, which are already gone), so a reset
 * that is aborted between commit and file removal is finished by simply
 * calling it again.
 *
 * Identity counters are intentionally NOT restarted: ids are never handed out
 * twice, so rights, privileges or assignments that outside consumers keyed on
 * an old alliance id can never point at a newly created alliance.
 */
@Injectable()
export class AllianceResetService {
  constructor(
    @Inject(ALLIANCE_STORE) private readonly store: AllianceStore,
    @Inject(ALLIANCE_ASSET_STORAGE)
    private readonly assets: AllianceAssetStorage,
    @Inject(ALLIANCE_CONTEXT_CLEANUP)
    private readonly contextCleanup: AllianceContextCleanup,
  ) {}

  async resetAllianceData(): Promise<void> {
    await this.store.transaction(async (tx) => {
      await this.contextCleanup.reset({ transaction: tx.transactionHandle() });
      await tx.deleteAllAllianceData();
    });
    for (const key of await this.assets.list()) {
      await this.assets.delete(key);
    }
  }
}
