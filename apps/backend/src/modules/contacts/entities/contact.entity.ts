import { ContactMode } from '@swuniverse/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../auth/user.entity';

@Entity('contacts')
@Unique('UQ_contacts_user_contact', ['userId', 'contactUserId'])
export class Contact {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  contactUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactUserId' })
  contactUser: User;

  @Column({ type: 'enum', enum: ContactMode })
  mode: ContactMode;

  @Column({ type: 'varchar', length: 255, default: '' })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;
}
