import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllianceModule } from '../alliance/alliance.module';
import { CombatModule } from '../combat/combat.module';
import { Fleet } from '../spacecraft/entities/fleet.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { SpacecraftModule } from '../spacecraft/spacecraft.module';
import { AlertReactionService } from './alert-reaction.service';
import { ThreatReactionService } from './threat-reaction.service';

/**
 * Connects the movement and threat reaction ports of the spacecraft core with the
 * internal battle resolver; neither module imports the other for it.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Spacecraft, Fleet]),
    SpacecraftModule,
    CombatModule,
    AllianceModule,
  ],
  providers: [AlertReactionService, ThreatReactionService],
})
export class AlertReactionModule {}
