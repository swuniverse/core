import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('ship_class_defs')
@Index(['key'], { unique: true })
export class ShipClassDef {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 64 })
  key: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 64 })
  category: string;

  @Column({ length: 64 })
  role: string;

  @Column({ type: 'int', nullable: true })
  factionId: number | null;

  @Column({ type: 'int', nullable: true })
  unlockTechId: number | null;

  @Column({ default: 0 })
  buildTimeTicks: number;

  @Column({ default: 0 })
  cargoCapacity: number;

  @Column({ default: 0 })
  crewMin: number;

  @Column({ default: 0 })
  crewMax: number;

  @Column({ default: 100 })
  hullBase: number;

  @Column({ default: 50 })
  shieldBase: number;

  @Column({ default: 100 })
  epsBase: number;

  @Column({ default: 2 })
  warpBase: number;

  @Column({ default: 0 })
  batteryBase: number;

  @Column({ default: false })
  starterAllowed: boolean;

  @Column({ default: false })
  isNpc: boolean;
}
