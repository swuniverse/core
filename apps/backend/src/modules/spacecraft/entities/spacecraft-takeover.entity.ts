import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('spacecraft_takeovers')
@Index(['attackerId'], { unique: true })
@Index(['targetId'], { unique: true })
export class SpacecraftTakeover {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  attackerId!: number;

  @Column()
  targetId!: number;

  @Column()
  attackerUserId!: number;

  @Column()
  targetUserId!: number;

  @Column({ type: 'int', default: 10 })
  ticksRemaining!: number;

  @Column({ type: 'int' })
  prestigeCost!: number;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
