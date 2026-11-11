import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('anomaly_types')
export class AnomalyType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  key: string;
}
