import { DataSource } from 'typeorm';
import { PrestigeModule } from '../prestige/prestige.module';
import { PrestigeService } from '../prestige/prestige.service';
import { SeasonalAnomalyService } from './seasonal-anomaly.service';
import { SeasonalAnomalyHandler } from './seasonal-anomaly.handler';
import { SeasonalAnomalyController } from './seasonal-anomaly.controller';
import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagingModule } from '../messaging/messaging.module';
import { MessagingService } from '../messaging/messaging.service';
import { SubspaceEllipseHandler } from './subspace-ellipse.handler';
import { AnomalyFlightConsequence } from './anomaly-flight-consequence';
import { AnomalyQueryService } from './anomaly-query.service';
import { AnomalyRegistry } from './anomaly-registry';
import {
  DEFAULT_LOCATIONS_PER_ION_STORM,
  IonStormHandler,
} from './ion-storm.handler';
import { createAnomalyRandom } from './stu-random';
import { AnomalyService } from './anomaly.service';

@Module({
  imports: [MessagingModule, PrestigeModule],
  controllers: [SeasonalAnomalyController],
  providers: [
    {
      provide: SeasonalAnomalyService,
      useFactory: (
        db: DataSource,
        config: ConfigService,
        prestige: PrestigeService,
      ) => new SeasonalAnomalyService(db, config, prestige),
      inject: [DataSource, ConfigService, PrestigeService],
    },
    AnomalyRegistry,
    AnomalyService,
    AnomalyFlightConsequence,
    AnomalyQueryService,
    {
      provide: SubspaceEllipseHandler,
      useFactory: (messaging: MessagingService) =>
        new SubspaceEllipseHandler(messaging, {
          integer: (min: number, max: number) =>
            min + Math.floor(Math.random() * (max - min + 1)),
        }),
      inject: [MessagingService],
    },
    {
      provide: IonStormHandler,
      useFactory: (config: ConfigService) =>
        new IonStormHandler(createAnomalyRandom(), {
          locationsPerStorm:
            Number(config.get('ION_STORM_LOCATIONS_PER_STORM')) ||
            DEFAULT_LOCATIONS_PER_ION_STORM,
        }),
      inject: [ConfigService],
    },
  ],
  exports: [
    AnomalyRegistry,
    AnomalyService,
    AnomalyFlightConsequence,
    AnomalyQueryService,
    IonStormHandler,
  ],
})
export class AnomalyModule implements OnModuleInit {
  constructor(
    private readonly registry: AnomalyRegistry,
    private readonly ellipse: SubspaceEllipseHandler,
    private readonly ionStorm: IonStormHandler,
    private readonly seasonal: SeasonalAnomalyService,
  ) {}
  onModuleInit(): void {
    this.registry.register(this.ellipse);
    this.registry.register(this.ionStorm);
    this.registry.register(
      new SeasonalAnomalyHandler('LIFE_DAY_GIFT', this.seasonal),
    );
    this.registry.register(
      new SeasonalAnomalyHandler('SPRING_CAPSULE', this.seasonal),
    );
  }
}
