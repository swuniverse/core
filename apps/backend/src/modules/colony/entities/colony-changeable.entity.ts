import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { Colony } from './colony.entity';

@Entity('colony_changeable')
export class ColonyChangeable {
  @PrimaryColumn()
  colonyId: number;

  @OneToOne(() => Colony, (colony) => colony.changeable, { onDelete: 'CASCADE' })
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

  @Column({ default: 0 })
  energy: number;

  @Column({ default: 0 })
  maxEnergy: number;

  @Column({ default: 0 })
  maxStorage: number;

  @Column({ default: 0 })
  shields: number;

  @Column({ default: 0 })
  maxShields: number;

  @Column({ type: 'int', nullable: true })
  shieldFrequency: number | null;

  @Column({ type: 'int', nullable: true })
  torpedoTypeId: number | null;

  @Column({ type: 'text', nullable: true })
  colonyMessage: string | null;

  @Column({ default: false })
  isBlockaded: boolean;

  @Column({ default: 0 })
  trainedCrew: number;
}
