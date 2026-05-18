import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('border_types')
@Index(['name'], { unique: true })
export class BorderType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 128 })
  name: string;

  @Column({ type: 'varchar', length: 32, default: 'border-default' })
  colorKey: string;

  @Column({ type: 'varchar', length: 16, default: 'solid' })
  style: string;
}
