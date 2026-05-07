import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { FactionEntity } from './faction.entity';

@Entity('faction_modifiers')
@Index(['factionId'], { unique: true })
export class FactionModifier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  factionId: number;

  @ManyToOne(() => FactionEntity, (faction) => faction.modifiers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'factionId' })
  faction: FactionEntity;

  @Column({ type: 'float', default: 1 })
  hullMultiplier: number;

  @Column({ type: 'float', default: 1 })
  shieldMultiplier: number;

  @Column({ type: 'float', default: 1 })
  cargoMultiplier: number;

  @Column({ type: 'float', default: 1 })
  researchMultiplier: number;

  @Column({ type: 'float', default: 1 })
  colonyGrowthMultiplier: number;

  @Column({ type: 'float', default: 1 })
  tradeModifier: number;
}
