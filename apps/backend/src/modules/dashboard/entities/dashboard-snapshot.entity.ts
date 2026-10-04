import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('dashboard_snapshots')
@Index(['recordedAt'])
export class DashboardSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  playerCount: number;

  @Column({ type: 'int' })
  activePlayerCount: number;

  @Column({ type: 'int' })
  colonyCount: number;

  @Column({ type: 'int' })
  shipCount: number;

  @Column({ type: 'int' })
  inFlightShipCount: number;

  @Column({ type: 'int' })
  holonetPostCount: number;

  @CreateDateColumn()
  recordedAt: Date;
}
