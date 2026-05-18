import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('system_explorations')
@Index(['userId', 'starSystemId'], { unique: true })
@Index(['userId'])
export class SystemExploration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  starSystemId: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  discoverySource: string | null;

  @CreateDateColumn()
  discoveredAt: Date;
}
