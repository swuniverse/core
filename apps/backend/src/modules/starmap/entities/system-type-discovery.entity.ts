import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('system_type_discoveries')
@Index(['userId', 'systemTypeId'], { unique: true })
export class SystemTypeDiscovery {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  systemTypeId: number;

  @Column({ type: 'varchar', length: 32 })
  source: 'SECTOR_SCAN' | 'SYSTEM_ENTRY';

  @Column({ type: 'int', nullable: true })
  spacecraftId: number | null;

  @Column({ type: 'int', nullable: true })
  layerId: number | null;

  @Column({ type: 'int', nullable: true })
  x: number | null;

  @Column({ type: 'int', nullable: true })
  y: number | null;

  @CreateDateColumn()
  discoveredAt: Date;
}
