import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from './migration-entities/user.entity.js';
import { Layer } from '../modules/starmap/entities/layer.entity.js';
import { LayerKnowledge } from '../modules/starmap/entities/layer-knowledge.entity.js';
import { LayerExploredEvent } from '../modules/starmap/entities/layer-explored-event.entity.js';
import { StarSystem } from '../modules/starmap/entities/star-system.entity.js';
import { CelestialObject } from '../modules/starmap/entities/celestial-object.entity.js';
import { GalaxyFieldType } from '../modules/starmap/entities/galaxy-field-type.entity.js';
import { GalaxyField } from '../modules/starmap/entities/galaxy-field.entity.js';
import { SystemField } from '../modules/starmap/entities/system-field.entity.js';
import { SpaceLocation } from '../modules/starmap/entities/space-location.entity.js';
import { MapRegion } from '../modules/starmap/entities/map-region.entity.js';
import { BorderType } from '../modules/starmap/entities/border-type.entity.js';
import { ExplorationState } from '../modules/starmap/entities/exploration-state.entity.js';
import { SystemExploration } from '../modules/starmap/entities/system-exploration.entity.js';
import { PlanetField } from '../modules/starmap/entities/planet-field.entity.js';
import { InfluenceArea } from '../modules/starmap/entities/influence-area.entity.js';
import { Wormhole } from '../modules/starmap/entities/wormhole.entity.js';
import { HyperspaceRoute } from '../modules/starmap/entities/hyperspace-route.entity.js';
import { HyperspaceRouteSegment } from '../modules/starmap/entities/hyperspace-route-segment.entity.js';
import { FactionEntity } from './migration-entities/faction.entity.js';
import { FactionModifier } from './migration-entities/faction-modifier.entity.js';
import { MigrationSpacecraft } from './migration-entities/spacecraft.entity.js';
import { MigrationAccountToken } from './migration-entities/account-token.entity.js';
import { News } from '../modules/news/entities/news.entity.js';
import { ProfileVisit } from '../modules/profile-visitor/entities/profile-visit.entity.js';

loadEnv();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL missing for TypeORM migrations');
}

const appDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: [
    User,
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
  migrations: ['apps/backend/src/database/migrations/*.ts'],
  synchronize: false,
  logging: false,
});

export default appDataSource;
