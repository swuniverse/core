import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WsEventType } from '@swuniverse/shared';
import { GameGateway } from '../websocket/game.gateway';
import { OrderBroadcast } from './entities/order-broadcast.entity';
import { OrderBroadcastAck } from './entities/order-broadcast-ack.entity';

export interface OrderBroadcastDto {
  id: number;
  message: string;
  createdAt: string;
}

@Injectable()
export class OrderBroadcastService {
  constructor(
    @InjectRepository(OrderBroadcast)
    private readonly broadcasts: Repository<OrderBroadcast>,
    @InjectRepository(OrderBroadcastAck)
    private readonly acks: Repository<OrderBroadcastAck>,
    private readonly gateway: GameGateway,
  ) {}

  async send(message: string): Promise<OrderBroadcastDto> {
    const saved = await this.broadcasts.save(
      this.broadcasts.create({ message: message.trim() }),
    );
    const dto = this.toDto(saved);
    // Online-Spieler sofort benachrichtigen; alle anderen holen sie beim Login ab.
    this.gateway.emitToAll(WsEventType.ORDER_BROADCAST, dto);
    return dto;
  }

  /** Unbestätigte Nachrichten, die nach der Registrierung des Spielers gesendet wurden. Neueste zuerst. */
  async listPending(userId: number): Promise<OrderBroadcastDto[]> {
    const rows = await this.broadcasts
      .createQueryBuilder('b')
      .innerJoin('users', 'u', 'u.id = :userId', { userId })
      .where('b."createdAt" >= u."createdAt"')
      .andWhere(
        `NOT EXISTS (SELECT 1 FROM order_broadcast_acks a WHERE a."broadcastId" = b.id AND a."userId" = :userId)`,
        { userId },
      )
      .orderBy('b.id', 'DESC')
      .getMany();
    return rows.map((row) => this.toDto(row));
  }

  async acknowledge(userId: number, ids: number[]): Promise<void> {
    if (!ids.length) return;
    await this.acks
      .createQueryBuilder()
      .insert()
      .values(ids.map((broadcastId) => ({ broadcastId, userId })))
      .orIgnore()
      .execute();
  }

  private toDto(row: OrderBroadcast): OrderBroadcastDto {
    return {
      id: row.id,
      message: row.message,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
