import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** STU `SpacecraftLogScan`: until when a user has read a spacecraft's logbook. */
@Entity('ship_log_scans')
@Index(['spacecraftId'])
export class ShipLogScan {
  @PrimaryColumn()
  userId: number;

  @PrimaryColumn()
  spacecraftId: number;

  @Column({ type: 'timestamp' })
  scannedAt: Date;
}
