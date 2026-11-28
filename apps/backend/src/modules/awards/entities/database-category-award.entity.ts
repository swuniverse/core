import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { DatabaseAwardCategory } from '@swuniverse/shared';
import { Layer } from '../../starmap/entities/layer.entity';
import { Award } from './award.entity';

/** STU `DatabaseCategoryAward`: award for a completed category (per layer for star systems). */
@Entity('database_category_awards')
@Check('CHK_database_category_awards_category', `"category" IN ('SHIP_HULLS', 'SHIP_HULLS_OLDTIMER', 'PLANET_TYPES', 'SYSTEM_TYPES', 'SYSTEMS')`)
@Check('CHK_database_category_awards_layer', `("category" = 'SYSTEMS') = ("layerId" IS NOT NULL)`)
@Index('UQ_database_category_awards_category', ['category'], { unique: true, where: '"layerId" IS NULL' })
@Index('UQ_database_category_awards_layer', ['category', 'layerId'], { unique: true, where: '"layerId" IS NOT NULL' })
export class DatabaseCategoryAward {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 32 })
  category: DatabaseAwardCategory;

  @Column({ type: 'int', nullable: true })
  layerId: number | null;

  @ManyToOne(() => Layer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'layerId' })
  layer: Layer | null;

  @Column({ type: 'varchar', length: 64 })
  awardKey: string;

  @ManyToOne(() => Award, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'awardKey' })
  award: Award;
}
