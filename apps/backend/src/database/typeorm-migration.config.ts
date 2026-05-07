import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from './migration-entities/user.entity';
import { Layer } from '../modules/starmap/entities/layer.entity';
import { StarSystem } from '../modules/starmap/entities/star-system.entity';
import { CelestialObject } from '../modules/starmap/entities/celestial-object.entity';
import { GalaxyFieldType } from '../modules/starmap/entities/galaxy-field-type.entity';
import { GalaxyField } from '../modules/starmap/entities/galaxy-field.entity';
import { SystemField } from '../modules/starmap/entities/system-field.entity';
import { FactionEntity } from './migration-entities/faction.entity';
import { FactionModifier } from './migration-entities/faction-modifier.entity';

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
    StarSystem,
    CelestialObject,
    GalaxyFieldType,
    GalaxyField,
    SystemField,
    FactionEntity,
    FactionModifier,
  ],
  migrations: ['apps/backend/src/database/migrations/*.ts'],
  synchronize: false,
  logging: false,
});

export default appDataSource;
