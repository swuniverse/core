import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { WsEventType, type DatabaseEntryDiscoveredEventDto } from '@swuniverse/shared';
import { GameGateway } from '../websocket/game.gateway';
import { DatabaseCompletionService } from './database-completion.service';
import {
  DATABASE_DISCOVERY,
  type DatabaseDiscovery,
  type DatabaseDiscoveryPort,
} from './database-discovery.port';

/** STU `AchievementManager` notice plus `checkForCategoryCompletion` per new entry. */
@Injectable()
export class DatabaseDiscoveryListener implements OnModuleInit {
  private readonly logger = new Logger(DatabaseDiscoveryListener.name);

  constructor(
    @Inject(DATABASE_DISCOVERY) private readonly port: DatabaseDiscoveryPort,
    private readonly gateway: GameGateway,
    private readonly completion: DatabaseCompletionService,
  ) {}

  onModuleInit(): void {
    this.port.notify = (discovery) => this.onDiscovered(discovery);
  }

  async onDiscovered({ userId, category, layerId, name, prestige }: DatabaseDiscovery): Promise<void> {
    const event: DatabaseEntryDiscoveredEventDto = {
      category,
      name,
      prestige,
      text: `Neuer Datenbankeintrag: ${name} (+${prestige} Prestige)`,
    };
    this.gateway.emitToUser(userId, WsEventType.DATABASE_ENTRY_DISCOVERED, event);
    try {
      await this.completion.checkCompletion(userId, category, layerId);
    } catch (error) {
      // A failed award check never undoes the discovery.
      this.logger.error(
        `Database award check ${category} for user ${userId} failed`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
