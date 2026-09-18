import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('spacecraft_wrecks')
@Index(['currentLayerId', 'posX', 'posY'])
@Index(['starSystemId', 'currentSystemFieldX', 'currentSystemFieldY'])
export class SpacecraftWreck {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  formerShipClassId: number;

  @Column({ type: 'int', nullable: true })
  currentLayerId: number | null;

  @Column({ type: 'int', nullable: true })
  starSystemId: number | null;

  @Column({ default: false })
  inSystem: boolean;

  @Column()
  posX: number;

  @Column()
  posY: number;

  @Column({ type: 'int', nullable: true })
  currentSystemFieldX: number | null;

  @Column({ type: 'int', nullable: true })
  currentSystemFieldY: number | null;

  @Column()
  hull: number;

  @Column({ default: 0 })
  crewCount: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  cargo: Array<{ commodityId: number; amount: number }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  torpedoes: Array<{
    torpedoTypeId: number;
    commodityId: number;
    amount: number;
  }>;

  @CreateDateColumn()
  createdAt: Date;
}
