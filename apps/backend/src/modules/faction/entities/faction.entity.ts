import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToMany,
} from 'typeorm';
import type { FactionModifier } from './faction-modifier.entity';

@Entity('factions')
@Index(['key'], { unique: true })
export class FactionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 64 })
  key: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 32 })
  colorPrimary: string;

  @Column({ length: 32 })
  colorSecondary: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  homeZone: string | null;

  @Column({ type: 'boolean', default: true })
  isSelectable: boolean;

  /** STU `player_limit`: 0 = unlimited. */
  @Column({ type: 'int', default: 0 })
  playerLimit: number;

  @Column({ type: 'int', nullable: true })
  starterShipClassId: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  starterProfileKey: string | null;

  @Column({ type: 'int', nullable: true })
  startResearchTechId: number | null;

  @Column({ type: 'int', nullable: true })
  startBuildingId: number | null;

  @OneToMany(
    () => require('./faction-modifier.entity').FactionModifier,
    (modifier: FactionModifier) => modifier.faction,
    { cascade: true },
  )
  modifiers: FactionModifier[];
}
