import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type GameStatusKind = 'ONLINE' | 'MAINTENANCE_ANNOUNCED' | 'MAINTENANCE';

@Entity('game_status')
export class GameStatus {
  @PrimaryColumn({ type: 'smallint' })
  id: number;

  @Column({ type: 'varchar', length: 32, default: 'ONLINE' })
  status: GameStatusKind;

  @Column({ type: 'text', default: '' })
  message: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
