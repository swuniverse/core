import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * STU `AllianceMemberJob`. `founder` is pinned to the role by a composite
 * foreign key, so the partial unique index allows one president per alliance.
 */
@Entity('alliance_member_roles')
@Index('UQ_alliance_member_roles_founder', ['roleId'], {
  unique: true,
  where: '"founder"',
})
export class AllianceMemberRole {
  @PrimaryColumn({ type: 'int' })
  membershipId: number;

  @PrimaryColumn({ type: 'int' })
  roleId: number;

  @Column({ type: 'boolean', default: false })
  founder: boolean;
}
