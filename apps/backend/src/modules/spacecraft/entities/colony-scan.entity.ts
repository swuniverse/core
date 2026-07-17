import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Colony } from '../../colony/entities/colony.entity';
import { User } from '../../auth/user.entity';

@Entity('colony_scans')
@Index(['userId', 'colonyId'])
@Index(['colonyOwnerId'])
export class ColonyScan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  colonyId: number;

  @ManyToOne(() => Colony, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'colonyId' })
  colony: Colony;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int', nullable: true })
  colonyOwnerId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  colonyName: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  colonyOwnerUsername: string | null;

  @Column({ type: 'int', nullable: true })
  starSystemId: number | null;

  @Column({ type: 'int', nullable: true })
  celestialObjectId: number | null;

  @Column({ type: 'int', nullable: true })
  colonyClassId: number | null;

  @Column({ type: 'int', nullable: true })
  surfaceWidth: number | null;

  @Column({ type: 'int', nullable: true })
  surfaceHeight: number | null;

  @Column({ type: 'simple-json' })
  surfaceFields: Array<{
    fieldIndex: number;
    fieldType: number;
    terrainTileId: number | null;
    buildingId: number | null;
    buildingName: string | null;
    hasBuilding: boolean;
    isConstruction: boolean;
    isActive: boolean;
    integrityPercent: number | null;
  }>;

  @CreateDateColumn()
  createdAt: Date;
}
