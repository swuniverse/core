import { Module, OnModuleInit } from '@nestjs/common';
import { MessagingModule } from '../messaging/messaging.module';
import { MessagingService } from '../messaging/messaging.service';
import { SubspaceEllipseHandler } from './subspace-ellipse.handler';
import { AnomalyFlightConsequence } from './anomaly-flight-consequence';
import { AnomalyQueryService } from './anomaly-query.service';
import { AnomalyRegistry } from './anomaly-registry';
import { AnomalyService } from './anomaly.service';

@Module({
  imports: [MessagingModule],
  providers: [AnomalyRegistry, AnomalyService, AnomalyFlightConsequence, AnomalyQueryService, {
    provide: SubspaceEllipseHandler,
    useFactory: (messaging: MessagingService) => new SubspaceEllipseHandler(messaging, {
      integer: (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1)),
    }),
    inject: [MessagingService],
  }],
  exports: [AnomalyRegistry, AnomalyService, AnomalyFlightConsequence, AnomalyQueryService],
})
export class AnomalyModule implements OnModuleInit {
  constructor(private readonly registry: AnomalyRegistry, private readonly ellipse: SubspaceEllipseHandler) {}
  onModuleInit(): void { this.registry.register(this.ellipse); }
}
