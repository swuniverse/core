import { BadRequestException, Injectable } from '@nestjs/common';
import { SPACECRAFT_RUNTIME_SYSTEM_KEYS } from '@swuniverse/shared';
import type {
  SpacecraftRuntimeSystemKey,
  SpacecraftRuntimeSystemStateDto,
  SpacecraftRuntimeSystemsDto,
} from '@swuniverse/shared';
import { Spacecraft } from './entities/spacecraft.entity';
import type { SpacecraftModule } from './entities/spacecraft-module.entity';

export type SpacecraftRuntimeSystemState = SpacecraftRuntimeSystemStateDto;
export type SpacecraftRuntimeSystems = SpacecraftRuntimeSystemsDto;
export type { SpacecraftRuntimeSystemKey } from '@swuniverse/shared';

export function getRuntimeSystemsForModule(
  module: Pick<SpacecraftModule, 'category' | 'moduleType'>,
): SpacecraftRuntimeSystemKey[] {
  const category = module.category.toUpperCase();
  const name = module.moduleType.toLowerCase();
  if (category === 'SHIELDS') return ['SHIELDS'];
  if (category === 'COMPUTER') return ['COMPUTER'];
  if (category === 'SUBLIGHT_DRIVE' || category === 'SUBLIGHT_ENGINE') {
    return ['SUBLIGHT_DRIVE'];
  }
  if (category === 'HYPERDRIVE') return ['WARPDRIVE'];
  if (category === 'ENERGY_WEAPON' || category === 'WEAPONS') {
    return ['WEAPONS'];
  }
  if (category === 'TORPEDO_BANK' || category === 'PROJECTILE') {
    return ['TORPEDO_BANK'];
  }
  if (category === 'SENSORS') {
    return ['LONG_RANGE_SENSORS', 'SHORT_RANGE_SENSORS'];
  }
  if (category === 'REACTOR' || name.includes('reaktor')) return ['REACTOR'];
  if (category === 'EPS' || name.includes('energieverteiler')) return ['EPS'];
  if (category === 'TRACTOR_BEAM') return ['TRACTOR_BEAM'];
  if (category === 'SPECIAL') {
    if (name === 'astrometrie-labor') return ['ASTROMETRY_LAB'];
    if (name === 'tarnvorrichtung') return ['CLOAK'];
    if (name === 'hypermaterie-transferkoppler') {
      return ['REACTOR_CHARGE_TRANSFER'];
    }
    if (name === 'hyperantriebs-notladegerät') {
      return ['HYPERDRIVE_BOOSTER'];
    }
    if (name === 'hyperraumfeldscanner') return ['SUBSPACE_SCANNER'];
    if (name === 'matrixsensoren') return ['MATRIX_SCANNER'];
    if (name === 'gravitationswellenscanner') return ['TACHYON_SCANNER'];
    if (name === 'molekular-raffinerie') return ['RESOURCE_CONVERTER'];
    if (name === 'shuttlerampe') return ['SHUTTLE_RAMP'];
    if (name === 'ressourcen-kollektor') return ['RESOURCE_COLLECTOR'];
    if (name === 'hyperraum-spule') return ['HYPERSPACE_COIL'];
    if (name === 'peilsender') return ['TRACKER'];
    return ['SPECIAL'];
  }
  return [];
}

/** Cooldowns from 2001-09-09 on are epoch-ms deadlines (STU style); smaller ones count ticks. */
const EPOCH_MS_COOLDOWN = 1_000_000_000_000;

/** Runtime cooldowns are either remaining ticks or, like STU, an epoch-ms deadline. */
export function isCoolingDown(
  state: { cooldown?: number | null } | undefined,
  now = Date.now(),
): boolean {
  const cooldown = state?.cooldown ?? 0;
  return cooldown >= EPOCH_MS_COOLDOWN ? cooldown > now : cooldown > 0;
}

function cooldownReason(cooldown: number, now = Date.now()): string {
  return cooldown >= EPOCH_MS_COOLDOWN
    ? `Cooldown noch ${Math.ceil((cooldown - now) / 60_000)} Min.`
    : `Cooldown ${cooldown}`;
}

@Injectable()
export class SpacecraftRuntimeStateService {
  initialize(ship: Spacecraft): SpacecraftRuntimeSystems {
    return initializeSpacecraftRuntimeSystems(ship);
  }

  validateActivation(
    systems: SpacecraftRuntimeSystems,
    key: SpacecraftRuntimeSystemKey,
  ): string | null {
    const system = systems[key];
    if (!system) return 'System nicht verfügbar';
    if (isCoolingDown(system)) return cooldownReason(system.cooldown);
    if (system.integrity <= 0) return 'System zerstört';
    return null;
  }

  requireActivation(
    systems: SpacecraftRuntimeSystems,
    key: SpacecraftRuntimeSystemKey,
  ): void {
    const reason = this.validateActivation(systems, key);
    if (reason) throw new BadRequestException(reason);
  }

  getSystems(ship: Spacecraft): SpacecraftRuntimeSystems {
    return getStoredSystems(ship);
  }
}

export function initializeSpacecraftRuntimeSystems(
  ship: Spacecraft,
): SpacecraftRuntimeSystems {
  if (ship.status === 'UNDER_SCRAPPING') {
    ship.runtimeSystems = {};
    return {};
  }
  const systems = getStoredSystems(ship);
  const legacy = (
    systems as Record<string, SpacecraftRuntimeSystemState | undefined>
  ).SENSORS;
  if (legacy) {
    systems.LONG_RANGE_SENSORS ??= { ...legacy };
    systems.SHORT_RANGE_SENSORS ??= { ...legacy };
    delete (systems as Record<string, unknown>).SENSORS;
  }

  // Callers without hydrated modules retain the legacy state until they can
  // load the relation. Authorization paths load modules explicitly.
  if (ship.modules) {
    const smallCraft = ship.shuttleCommodityId != null ||
      ['SHUTTLE', 'WORKBEE'].includes(ship.shipClass?.role ?? '');
    const availableSystems = getAvailableSystems(ship.modules, smallCraft);
    if (ship.kind === 'STATION') availableSystems.add('BEAM_BLOCKER');
    if (ship.kind === 'STATION' && ship.stationRole === 'SENSOR') availableSystems.add('UPLINK');
    for (const key of Object.keys(systems) as SpacecraftRuntimeSystemKey[]) {
      if (!availableSystems.has(key)) delete systems[key];
    }
    for (const key of availableSystems) {
      const backingModules = ship.modules.filter((module) =>
        getRuntimeSystemsForModule(module).includes(key),
      );
      systems[key] ??= {
        // The cloak never starts engaged: it costs energy and shuts down
        // shields and weapons, so the owner has to switch it on explicitly.
        active:
          key !== 'CLOAK' &&
          key !== 'TRACTOR_BEAM' &&
          key !== 'TRACKER' &&
          key !== 'HYPERSPACE_COIL' &&
          key !== 'RESOURCE_COLLECTOR' &&
          key !== 'RESOURCE_CONVERTER' &&
          key !== 'SHUTTLE_RAMP' &&
          key !== 'BEAM_BLOCKER' &&
          key !== 'UPLINK' &&
          (key === 'LIFE_SUPPORT' ||
            key === 'DEFLECTOR' ||
            backingModules.length === 0 ||
            backingModules.some((module) => module.isActive !== false)),
        cooldown: Math.max(
          0,
          ...backingModules.map((module) => module.cooldown ?? 0),
        ),
        integrity:
          backingModules.length > 0
            ? Math.max(
                ...backingModules.map((module) => module.integrity ?? 100),
              )
            : 100,
      };
    }
  } else {
    for (const key of SPACECRAFT_RUNTIME_SYSTEM_KEYS) {
      if (
        key === 'ASTROMETRY_LAB' ||
        key === 'CLOAK' ||
        key === 'TACHYON_SCANNER' ||
        key === 'HYPERSPACE_COIL' ||
        key === 'RESOURCE_COLLECTOR' ||
        key === 'RESOURCE_CONVERTER' ||
        key === 'SHUTTLE_RAMP' ||
        key === 'BEAM_BLOCKER' ||
        key === 'UPLINK'
      )
        continue;
      systems[key] ??= { active: true, cooldown: 0, integrity: 100 };
    }
  }
  // STU station defaults are independent of module hydration. Reading retains
  // forced shutdown and damage; only startup/repair may restore their mode.
  if (ship.kind === 'STATION') {
    systems.BEAM_BLOCKER ??= {
      active: false,
      cooldown: 0,
      integrity: 100,
    };
  } else delete systems.BEAM_BLOCKER;
  if (ship.kind === 'STATION' && ship.stationRole === 'SENSOR') {
    systems.UPLINK ??= { active: false, cooldown: 0, integrity: 100, current: 0, max: 3 };
  } else delete systems.UPLINK;
  if (systems.EPS) {
    systems.EPS = withDefaults(systems.EPS, {
      current: ship.energy,
      max: ship.epsMax || ship.energyMax,
    });
  }
  if (systems.WARPDRIVE) {
    systems.WARPDRIVE = withDefaults(systems.WARPDRIVE, {
      current: ship.warpdrive,
      max: ship.warpdriveMax,
    });
  }
  if (systems.REACTOR) {
    systems.REACTOR = withDefaults(systems.REACTOR, {
      current: ship.reactorOutput,
      max: ship.reactorOutput,
    });
  }
  if (systems.SHIELDS) {
    systems.SHIELDS = withDefaults(systems.SHIELDS, {
      current: ship.shields,
      max: ship.shieldsMax,
    });
  }
  ship.runtimeSystems = systems;
  return systems;
}

function getAvailableSystems(
  modules: SpacecraftModule[] | undefined,
  smallCraft = false,
): Set<SpacecraftRuntimeSystemKey> {
  // STU getDefaultSystems: life support is universal; small craft have no
  // default deflector. Other systems require installed modules.
  const systems = new Set<SpacecraftRuntimeSystemKey>(['LIFE_SUPPORT']);
  if (!smallCraft) systems.add('DEFLECTOR');
  if (!modules) {
    for (const key of SPACECRAFT_RUNTIME_SYSTEM_KEYS) {
      if (
        ![
          'ASTROMETRY_LAB',
          'CLOAK',
          'SUBSPACE_SCANNER',
          'TACHYON_SCANNER',
          'MATRIX_SCANNER',
          'TRACKER',
          'HYPERSPACE_COIL',
          'RESOURCE_COLLECTOR',
          'RESOURCE_CONVERTER',
          'SHUTTLE_RAMP',
          'BEAM_BLOCKER',
          'UPLINK',
        ].includes(key)
      )
        systems.add(key);
    }
    return systems;
  }

  for (const module of modules) {
    for (const system of getRuntimeSystemsForModule(module))
      systems.add(system);
  }
  return systems;
}

function withDefaults(
  state: SpacecraftRuntimeSystemState | undefined,
  values: Pick<SpacecraftRuntimeSystemState, 'current' | 'max'>,
): SpacecraftRuntimeSystemState {
  return {
    active: state?.active ?? true,
    cooldown: state?.cooldown ?? 0,
    integrity: state?.integrity ?? 100,
    ...values,
  };
}

function getStoredSystems(ship: Spacecraft): SpacecraftRuntimeSystems {
  const value = ship.runtimeSystems;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as SpacecraftRuntimeSystems;
}
