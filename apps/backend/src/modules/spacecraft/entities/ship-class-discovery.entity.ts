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
  source: 'TARGET_SCAN';

  @Column()
  sourceSpacecraftId: number;

  @Column()
  targetSpacecraftId: number;

  @CreateDateColumn()
  discoveredAt: Date;
}
