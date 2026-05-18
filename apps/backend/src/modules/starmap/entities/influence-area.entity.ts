import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

export enum InfluenceSourceType {
  STATION = 'STATION',
  ALLIANCE = 'ALLIANCE',
  FACTION = 'FACTION',
}

@Entity('influence_areas')
@Index(['layerId', 'cx', 'cy'])
@Index(['sourceType', 'sourceId'])
export class InfluenceArea {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  layerId: number;

  @Column()
  cx: number;

  @Column()
  cy: number;

  @Column({ type: 'varchar', length: 16 })
  sourceType: InfluenceSourceType;

  @Column()
  sourceId: number;

  @Column({ default: 3 })
  radius: number;

  @Column({ type: 'float', default: 1.0 })
  strength: number;

  @CreateDateColumn()
  calculatedAt: Date;
}
