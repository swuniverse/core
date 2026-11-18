import { BadRequestException, Injectable } from '@nestjs/common';
import { FieldEffect, knownFieldEffects } from '@swuniverse/shared';
import {
  AlertState,
  Spacecraft,
  SpacecraftOperatingMode,
} from './entities/spacecraft.entity';
import {
  SpacecraftRuntimeStateService,
  SpacecraftRuntimeSystemKey,
} from './spacecraft-runtime-state.service';

const LABELS: Partial<Record<SpacecraftRuntimeSystemKey, string>> = {
  COMPUTER: 'Computer',
  SHIELDS: 'Schilde',
  SHORT_RANGE_SENSORS: 'Nahbereichssensoren',
  WEAPONS: 'Strahlenwaffen',
  TORPEDO_BANK: 'Projektilwaffe',
  CLOAK: 'Tarnung',
};

export interface SpacecraftAlertOptions {
  hasEnoughCrew?: boolean;
  hasColony?: boolean;
  shieldBlocked?: string;
  /** STU combat reaction from GREEN only raises the level on this cycle. */
  activateSystems?: boolean;
  now?: number;
}

@Injectable()
export class SpacecraftAlertService {
  constructor(private readonly runtimeState: SpacecraftRuntimeStateService) {}

  apply(
    ship: Spacecraft,
    alertState: AlertState,
    options: SpacecraftAlertOptions = {},
  ) {
    const systems = this.runtimeState.initialize(ship);
    const messages: string[] = [];
    const rejections: Array<{
      systemKey: SpacecraftRuntimeSystemKey;
      reason: string;
    }> = [];
    const reject = (key: SpacecraftRuntimeSystemKey, reason: string) => {
      rejections.push({ systemKey: key, reason });
      messages.push(
        `${LABELS[key] ?? key} konnte nicht aktiviert werden: ${reason}`,
      );
    };
    const levelCost =
      alertState === AlertState.RED && ship.alertState !== AlertState.RED
        ? 2
        : alertState === AlertState.YELLOW &&
            ship.alertState === AlertState.GREEN
          ? 1
          : 0;
    if (levelCost > 0) {
      if (ship.energy < levelCost)
        throw new BadRequestException(
          'Nicht genügend EPS zum Wechsel der Alarmstufe',
        );
      ship.energy -= levelCost;
    }
    const activate: SpacecraftRuntimeSystemKey[] =
      options.activateSystems === false
        ? []
        : alertState === AlertState.RED
          ? ['SHIELDS', 'SHORT_RANGE_SENSORS', 'WEAPONS', 'TORPEDO_BANK']
          : alertState === AlertState.YELLOW
            ? ['SHIELDS', 'SHORT_RANGE_SENSORS', 'WEAPONS']
            : [];
    const deactivate: SpacecraftRuntimeSystemKey[] =
      alertState === AlertState.GREEN
        ? ['SHIELDS', 'WEAPONS', 'TORPEDO_BANK']
        : options.activateSystems === false
          ? []
          : ['CLOAK'];
    for (const key of deactivate) {
      const system = systems[key];
      if (system?.active) {
        systems[key] = { ...system, active: false };
        messages.push(`${LABELS[key]} deaktiviert`);
      }
    }
    const hasEnoughCrew =
      options.hasEnoughCrew ?? (ship.crew ?? 0) >= (ship.crewRequired ?? 0);
    const field = ship.location?.systemField ?? ship.location?.galaxyField;
    const effects = knownFieldEffects([
      ...(field?.fieldType?.effects ?? []),
      ...((field && 'effects' in field ? field.effects : []) ?? []),
    ]);
    for (const key of activate) {
      const system = systems[key];
      if (!system) continue;
      const invalid = this.runtimeState.validateActivation(systems, key);
      if (invalid) {
        reject(key, invalid);
        continue;
      }
      if (system.active) {
        messages.push(`${LABELS[key]} bereits aktiviert`);
        continue;
      }
      let reason: string | undefined;
      if (!hasEnoughCrew) reason = 'Nicht ausreichend Crew';
      else if (key === 'SHIELDS') {
        if (ship.tractoredShipId != null)
          reason = 'Traktorstrahl ist aktiviert';
        else if (options.shieldBlocked) reason = options.shieldBlocked;
        else if (ship.shields <= 0) reason = 'Schildemitter sind erschöpft';
        else if (effects.includes(FieldEffect.SHIELD_MALFUNCTION))
          reason = 'Schildstörung am Feld';
      } else if (key === 'SHORT_RANGE_SENSORS') {
        if (options.hasColony === false)
          reason = 'Noch keine Kolonie kolonisiert';
        else if (
          ship.shortRangeSensorsCooldownUntil &&
          ship.shortRangeSensorsCooldownUntil.getTime() >
            (options.now ?? Date.now())
        )
          reason = 'Nahbereichssensoren im Cooldown';
      }
      if (
        !reason &&
        (!systems.EPS || systems.EPS.integrity <= 0 || ship.energy < 1)
      )
        reason = 'Nicht genügend EPS';
      if (reason) {
        reject(key, reason);
        continue;
      }
      ship.energy--;
      systems[key] = { ...system, active: true };
      if (key === 'SHIELDS') ship.dockedAtId = null;
      messages.push(`${LABELS[key]} aktiviert`);
    }
    ship.alertState = alertState;
    ship.operatingMode = SpacecraftOperatingMode.NORMAL;
    ship.runtimeSystems = systems;
    if (systems.EPS) systems.EPS.current = ship.energy;
    const label =
      alertState === AlertState.RED
        ? 'Rot'
        : alertState === AlertState.YELLOW
          ? 'Gelb'
          : 'Grün';
    messages.push(`Alarmstufe auf ${label} geändert`);
    return { systems, messages, rejections };
  }
}
