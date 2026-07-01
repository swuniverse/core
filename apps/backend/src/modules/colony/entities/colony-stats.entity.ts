import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Colony } from './colony.entity';

@Entity('colony_stats')
export class ColonyStats {
  @PrimaryColumn()
  colonyId: number;

  @OneToOne(() => Colony, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'colonyId' })
  colony: Colony;

  @Column({ default: 0 })
  workers: number;

  @Column({ default: 0 })
  workless: number;

  @Column({ default: 0 })
  maxPopulation: number;

  @Column({ default: 0 })
  populationLimit: number;

  @Column({ default: true })
  immigrationEnabled: boolean;

  @Column({ type: 'text', nullable: true })
  colonyMessage: string | null;

  @Column({ default: 0 })
  maxEnergy: number;

  @Column({ default: 0 })
  maxStorage: number;

  @Column({ type: 'int', nullable: true })
  shields: number | null;

  @Column({ default: 0 })
  maxShields: number;

  @Column({ type: 'int', nullable: true })
  shieldFrequency: number | null;

  @Column({ type: 'int', nullable: true })
  torpedoTypeId: number | null;

  @Column({ default: 0 })
  trainedCrew: number;

  @Column({ default: false })
  isBlockaded: boolean;
}
