import { Injectable } from '@nestjs/common';
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
  SHIELDS: 'Schilde',
  SHORT_RANGE_SENSORS: 'Nahbereichssensoren',
  WEAPONS: 'Strahlenwaffen',
  TORPEDO_BANK: 'Projektilwaffe',
};

@Injectable()
export class SpacecraftAlertService {
  constructor(private readonly runtimeState: SpacecraftRuntimeStateService) {}

  apply(ship: Spacecraft, alertState: AlertState) {
    const systems = this.runtimeState.initialize(ship);
    const messages: string[] = [];
    const rejections: Array<{
      systemKey: SpacecraftRuntimeSystemKey;
      reason: string;
    }> = [];
    const activate: SpacecraftRuntimeSystemKey[] =
      alertState === AlertState.RED
        ? ['SHIELDS', 'SHORT_RANGE_SENSORS', 'WEAPONS', 'TORPEDO_BANK']
        : alertState === AlertState.YELLOW
          ? ['SHORT_RANGE_SENSORS']
          : [];
    const deactivate: SpacecraftRuntimeSystemKey[] =
      alertState === AlertState.GREEN
        ? ['SHIELDS', 'WEAPONS', 'TORPEDO_BANK']
        : [];

    for (const key of activate) {
      const system = systems[key];
      if (!system) continue;
      if (system.integrity <= 0) {
        rejections.push({ systemKey: key, reason: 'System zerstört' });
        messages.push(
          `${LABELS[key]} konnte nicht aktiviert werden: System zerstört`,
        );
      } else if (system.active) {
        messages.push(`${LABELS[key]} bereits aktiviert`);
      } else {
        systems[key] = { ...system, active: true };
        messages.push(`${LABELS[key]} aktiviert`);
      }
    }
    for (const key of deactivate) {
      const system = systems[key];
      if (!system) continue;
      if (system.active) {
        systems[key] = { ...system, active: false };
        messages.push(`${LABELS[key]} deaktiviert`);
      }
    }

    ship.alertState = alertState;
    ship.operatingMode = SpacecraftOperatingMode.NORMAL;
    ship.runtimeSystems = systems;
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
