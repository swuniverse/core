import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('ship_class_discoveries')
@Index(['userId', 'shipClassId'], { unique: true })
export class ShipClassDiscovery {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  shipClassId: number;

  @Column({ type: 'varchar', length: 32 })
  source: 'TARGET_SCAN' | 'RESEARCH' | 'AIRFIELD_START';

  @Column({ type: 'int', nullable: true })
  sourceSpacecraftId: number | null;

  @Column({ type: 'int', nullable: true })
  targetSpacecraftId: number | null;

  @CreateDateColumn()
  discoveredAt: Date;
}
