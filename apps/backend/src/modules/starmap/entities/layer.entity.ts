import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('layers')
export class Layer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column()
  width: number;

  @Column()
  height: number;

  @Column({ default: 20 })
  sectorSize: number;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: false })
  isNoobzone: boolean;

  @Column({ default: false })
  isFinished: boolean;

  @Column({ default: true })
  isHidden: boolean;
}
