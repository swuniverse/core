import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('galaxy_field_types')
@Index(['key'], { unique: true })
export class GalaxyFieldType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 64 })
  key: string;

  @Column({ length: 255 })
  name: string;

  @Column({ default: true })
  passable: boolean;

  @Column({ default: 1 })
  energyCost: number;

  @Column({ default: 0 })
  damage: number;

  @Column({ default: false })
  isSystem: boolean;

  @Column({ default: true })
  isVisible: boolean;

  @Column({ type: 'simple-json', nullable: true })
  effects: string[] | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  colorKey: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  category: string | null;
}
