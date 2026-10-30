import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('layer_explored_events')
export class LayerExploredEvent {
  @PrimaryColumn({ type: 'int' })
  userId: number;

  @PrimaryColumn({ type: 'int' })
  layerId: number;

  @Column({ type: 'timestamp' })
  completedAt: Date;
}
