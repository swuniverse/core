import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('order_broadcast_acks')
export class OrderBroadcastAck {
  @PrimaryColumn()
  broadcastId: number;

  @PrimaryColumn()
  userId: number;

  @CreateDateColumn()
  acknowledgedAt: Date;
}
