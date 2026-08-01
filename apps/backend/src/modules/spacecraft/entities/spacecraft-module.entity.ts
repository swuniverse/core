import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Spacecraft } from './spacecraft.entity';

@Entity('spacecraft_modules')
@Index(['spacecraftId'])
export class SpacecraftModule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  spacecraftId: number;

  @ManyToOne(() => Spacecraft, (s) => s.modules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spacecraftId' })
  spacecraft: Spacecraft;

  @Column({ length: 100 })
  moduleType: string;

  @Column({ length: 50 })
  category: string;
  @Column({ type: 'varchar', length: 64, nullable: true })
  slotId: string | null;

  @Column({ default: 1 })
  level: number;

  @Column({ type: 'int', default: 100 })
  integrity: number;

  @Column({ type: 'int', default: 0 })
  cooldown: number;

  @Column({ default: true })
  isActive: boolean;
}
