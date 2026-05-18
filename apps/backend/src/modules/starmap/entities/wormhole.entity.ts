import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('wormholes')
@Index(['entryLayerId', 'entryCx', 'entryCy'])
@Index(['exitLayerId', 'exitCx', 'exitCy'])
export class Wormhole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  entryLayerId: number;

  @Column()
  entryCx: number;

  @Column()
  entryCy: number;

  @Column()
  exitLayerId: number;

  @Column()
  exitCx: number;

  @Column()
  exitCy: number;

  @Column({ default: false })
  isBidirectional: boolean;

  @Column({ default: false })
  isRandomExit: boolean;

  @Column({ type: 'varchar', length: 128, nullable: true })
  name: string | null;

  @Column({ default: true })
  isActive: boolean;
}
