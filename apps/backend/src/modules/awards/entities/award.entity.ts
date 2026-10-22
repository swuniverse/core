import { Check, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('awards')
@Check('CHK_awards_prestige_nonnegative', '"prestige" >= 0')
export class Award {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'varchar', length: 255 })
  image: string;

  @Column({ default: 0 })
  prestige: number;

  @Column({ default: false })
  isNpc: boolean;
}
