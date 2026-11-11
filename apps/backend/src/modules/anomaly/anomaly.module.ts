import { Module } from '@nestjs/common';
import { AnomalyRegistry } from './anomaly-registry';
import { AnomalyService } from './anomaly.service';

@Module({
  providers: [AnomalyRegistry, AnomalyService],
  exports: [AnomalyRegistry, AnomalyService],
})
export class AnomalyModule {}
