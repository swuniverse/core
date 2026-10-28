import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('station_class_discoveries')
@Index(['userId', 'shipClassId'], { unique: true })
export class StationClassDiscovery {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  shipClassId: number;

  @Column({ type: 'varchar', length: 32 })
  source: 'TARGET_SCAN';

  @Column()
  sourceSpacecraftId: number;

  @Column()
  targetSpacecraftId: number;

  @CreateDateColumn()
  discoveredAt: Date;
}
