import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToMany,
} from 'typeorm';
import { FactionModifier } from './faction-modifier.entity';

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

  @Column({ type: 'int', nullable: true })
  starterShipClassId: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  starterProfileKey: string | null;

  @OneToMany(() => FactionModifier, (modifier) => modifier.faction, {
    cascade: true,
  })
  modifiers: FactionModifier[];
}
