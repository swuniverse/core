import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { User as MigrationUser } from './migration-entities/user.entity';
import { User as AppUser } from '../modules/auth/user.entity';
import { FactionEntity as AppFactionEntity } from '../modules/faction/entities/faction.entity';
import { FactionModifier as AppFactionModifier } from '../modules/faction/entities/faction-modifier.entity';
import { Layer } from '../modules/starmap/entities/layer.entity';
import { LayerKnowledge } from '../modules/starmap/entities/layer-knowledge.entity';
import { LayerExploredEvent } from '../modules/starmap/entities/layer-explored-event.entity';
import { StarSystem } from '../modules/starmap/entities/star-system.entity';
import { CelestialObject } from '../modules/starmap/entities/celestial-object.entity';
import { GalaxyFieldType } from '../modules/starmap/entities/galaxy-field-type.entity';
import { GalaxyField } from '../modules/starmap/entities/galaxy-field.entity';
import { SystemField } from '../modules/starmap/entities/system-field.entity';
import { SpaceLocation } from '../modules/starmap/entities/space-location.entity';
import { MapRegion } from '../modules/starmap/entities/map-region.entity';
import { BorderType } from '../modules/starmap/entities/border-type.entity';
import { ExplorationState } from '../modules/starmap/entities/exploration-state.entity';
import { SystemExploration } from '../modules/starmap/entities/system-exploration.entity';
import { PlanetField } from '../modules/starmap/entities/planet-field.entity';
import { InfluenceArea } from '../modules/starmap/entities/influence-area.entity';
import { Wormhole } from '../modules/starmap/entities/wormhole.entity';
import { HyperspaceRoute } from '../modules/starmap/entities/hyperspace-route.entity';
import { HyperspaceRouteSegment } from '../modules/starmap/entities/hyperspace-route-segment.entity';
import { FactionEntity } from './migration-entities/faction.entity';
import { FactionModifier } from './migration-entities/faction-modifier.entity';
import { MigrationSpacecraft } from './migration-entities/spacecraft.entity';
import { MigrationAccountToken } from './migration-entities/account-token.entity';
import { News } from '../modules/news/entities/news.entity';
import { ProfileVisit } from '../modules/profile-visitor/entities/profile-visit.entity';

loadEnv();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL missing for TypeORM migrations');
}

const appDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: [
    MigrationUser,
    AppUser,
    AppFactionEntity,
    AppFactionModifier,
    Layer,
    LayerKnowledge,
    LayerExploredEvent,
    StarSystem,
    CelestialObject,
    GalaxyFieldType,
    GalaxyField,
    SystemField,
    SpaceLocation,
    MapRegion,
    BorderType,
    ExplorationState,
    SystemExploration,
    PlanetField,
    InfluenceArea,
    Wormhole,
    HyperspaceRoute,
    HyperspaceRouteSegment,
    FactionEntity,
    FactionModifier,
    MigrationSpacecraft,
    MigrationAccountToken,
    News,
    ProfileVisit,
  ],
  migrations: ['apps/backend/src/database/migrations/[0-9]*-!(*.spec|*.test).ts'],
  synchronize: false,
  logging: false,
});

export default appDataSource;
