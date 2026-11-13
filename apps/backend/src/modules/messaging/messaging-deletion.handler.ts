import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { PlayerDeletionHandler } from '../account-deletion/player-deletion-handler';
import { PlayerDeletionService } from '../account-deletion/player-deletion.service';
import { Message } from './entities/message.entity';

/**
 * STU `PrivateMessageDeletionHandler` (sh-AP-05b): received messages go;
 * sent ones stay with their recipients from "Gelöschter Siedler".
 */
@Injectable()
export class MessagingDeletionHandler implements PlayerDeletionHandler, OnModuleInit {
  readonly order = 20;

  constructor(private readonly deletions: PlayerDeletionService) {}

  onModuleInit(): void {
    this.deletions.register(this);
  }

  async delete(tx: EntityManager, userId: number): Promise<void> {
    await tx.delete(Message, { recipientId: userId });
    await tx.update(Message, { senderId: userId }, { senderId: null });
  }
}
