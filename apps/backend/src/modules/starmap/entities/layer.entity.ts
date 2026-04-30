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

  @Column({ default: true })
  isHidden: boolean;
}
