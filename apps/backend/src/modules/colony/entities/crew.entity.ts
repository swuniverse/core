import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

export enum CrewType {
  COMMAND = 'COMMAND',
  SECURITY = 'SECURITY',
  SCIENCE = 'SCIENCE',
  TECHNICAL = 'TECHNICAL',
  NAVIGATION = 'NAVIGATION',
  CREWMAN = 'CREWMAN',
  CAPTAIN = 'CAPTAIN',
}

export enum CrewGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  DIVERSE = 'DIVERSE',
}

@Entity('crew')
@Index(['userId'])
export class Crew {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column({ type: 'varchar', default: CrewType.CREWMAN })
  type!: CrewType;

  @Column({ type: 'varchar', default: CrewGender.DIVERSE })
  gender!: CrewGender;

  @Column({ length: 255 })
  name!: string;
}
