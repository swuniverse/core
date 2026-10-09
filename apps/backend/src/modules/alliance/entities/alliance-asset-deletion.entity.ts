import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Durable retry task for deleting a physical alliance asset (banner file).
 * Persisted in the transaction that unreferenced the asset, so a crash or an
 * adapter failure after the commit can never leave the file orphaned. It has
 * no foreign key: the owning alliance may already be dissolved.
 */
@Entity('alliance_asset_deletions')
export class AllianceAssetDeletion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  assetKey: string;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  /** Not retried before this time. */
  @Column({ type: 'timestamp' })
  nextAttemptAt: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
