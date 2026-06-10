import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema20260501000000 implements MigrationInterface {
  name = 'InitialSchema20260501000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // === Factions ===
    await queryRunner.query(`
      CREATE TABLE "factions" (
        "id" SERIAL PRIMARY KEY,
        "key" varchar(64) NOT NULL UNIQUE,
        "name" varchar(255) NOT NULL,
        "colorPrimary" varchar(32) NOT NULL,
        "colorSecondary" varchar(32) NOT NULL,
        "homeZone" varchar(64),
        "starterShipClassId" integer,
        "starterProfileKey" varchar(64)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "faction_modifiers" (
        "id" SERIAL PRIMARY KEY,
        "factionId" integer NOT NULL UNIQUE,
        "hullMultiplier" float NOT NULL DEFAULT 1,
        "shieldMultiplier" float NOT NULL DEFAULT 1,
        "cargoMultiplier" float NOT NULL DEFAULT 1,
        "researchMultiplier" float NOT NULL DEFAULT 1,
        "colonyGrowthMultiplier" float NOT NULL DEFAULT 1,
        "tradeModifier" float NOT NULL DEFAULT 1,
        CONSTRAINT "FK_faction_modifiers_faction" FOREIGN KEY ("factionId") REFERENCES "factions"("id") ON DELETE CASCADE
      )
    `);

    // === Users ===
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL PRIMARY KEY,
        "username" varchar(32) NOT NULL UNIQUE,
        "email" varchar(255) NOT NULL UNIQUE,
        "passwordHash" varchar NOT NULL,
        "faction" varchar,
        "factionId" integer,
        "onboardingCompleted" boolean NOT NULL DEFAULT false,
        "isAdmin" boolean NOT NULL DEFAULT false,
        "starterColonyId" integer,
        "starterShipId" integer,
        "lastActiveTick" integer,
        "prestige" integer NOT NULL DEFAULT 0,
        "description" text,
        "vacationMode" boolean NOT NULL DEFAULT false,
        "vacationStartedAt" timestamp,
        "vacationEndedAt" timestamp,
        "deletionMark" integer NOT NULL DEFAULT 0,
        "refreshToken" varchar,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_users_faction" FOREIGN KEY ("factionId") REFERENCES "factions"("id") ON DELETE SET NULL
      )
    `);

    // === Starmap: Layers ===
    await queryRunner.query(`
      CREATE TABLE "layers" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(255) NOT NULL,
        "width" integer NOT NULL,
        "height" integer NOT NULL,
        "sectorSize" integer NOT NULL DEFAULT 20,
        "isDefault" boolean NOT NULL DEFAULT false,
        "isColonizable" boolean NOT NULL DEFAULT false,
        "isNoobZone" boolean NOT NULL DEFAULT false,
        "isFinished" boolean NOT NULL DEFAULT false,
        "isHidden" boolean NOT NULL DEFAULT true
      )
    `);

    // === Starmap: Galaxy Field Types ===
    await queryRunner.query(`
      CREATE TABLE "galaxy_field_types" (
        "id" SERIAL PRIMARY KEY,
        "key" varchar(64) NOT NULL UNIQUE,
        "name" varchar(255) NOT NULL,
        "passable" boolean NOT NULL DEFAULT true,
        "energyCost" integer NOT NULL DEFAULT 1,
        "damage" integer NOT NULL DEFAULT 0,
        "isSystem" boolean NOT NULL DEFAULT false,
        "isVisible" boolean NOT NULL DEFAULT true,
        "effects" text,
        "colorKey" varchar(32)
      )
    `);

    // === Starmap: Border Types ===
    await queryRunner.query(`
      CREATE TABLE "border_types" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(128) NOT NULL UNIQUE,
        "colorKey" varchar(32) NOT NULL DEFAULT 'border-default',
        "style" varchar(16) NOT NULL DEFAULT 'solid'
      )
    `);

    // === Starmap: Map Regions ===
    await queryRunner.query(`
      CREATE TABLE "map_regions" (
        "id" SERIAL PRIMARY KEY,
        "layerId" integer NOT NULL,
        "name" varchar(128) NOT NULL,
        "description" varchar(255),
        "colorKey" varchar(32) NOT NULL DEFAULT 'neutral',
        CONSTRAINT "FK_map_regions_layer" FOREIGN KEY ("layerId") REFERENCES "layers"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_map_regions_layer_name" UNIQUE ("layerId", "name")
      )
    `);

    // === Starmap: Star Systems ===
    await queryRunner.query(`
      CREATE TABLE "star_systems" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(255) NOT NULL,
        "cx" integer NOT NULL,
        "cy" integer NOT NULL,
        "layerId" integer NOT NULL,
        "systemTypeId" integer NOT NULL,
        "maxX" integer NOT NULL DEFAULT 22,
        "maxY" integer NOT NULL DEFAULT 22,
        CONSTRAINT "FK_star_systems_layer" FOREIGN KEY ("layerId") REFERENCES "layers"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_star_systems_coords" UNIQUE ("cx", "cy", "layerId")
      )
    `);

    // === Starmap: Galaxy Fields ===
    await queryRunner.query(`
      CREATE TABLE "galaxy_fields" (
        "id" SERIAL PRIMARY KEY,
        "layerId" integer NOT NULL,
        "cx" integer NOT NULL,
        "cy" integer NOT NULL,
        "fieldTypeId" integer NOT NULL,
        "factionZone" varchar(16) NOT NULL DEFAULT 'UNKNOWN',
        "systemTypeId" integer,
        "starSystemId" integer,
        "isPassable" boolean NOT NULL DEFAULT true,
        "energyCost" integer NOT NULL DEFAULT 1,
        "damage" integer NOT NULL DEFAULT 0,
        "effectFlags" text,
        "adminRegionKey" varchar(64),
        "regionId" integer,
        "borderTypeId" integer,
        "effects" text,
        "passableOverride" boolean,
        CONSTRAINT "FK_galaxy_fields_layer" FOREIGN KEY ("layerId") REFERENCES "layers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_galaxy_fields_field_type" FOREIGN KEY ("fieldTypeId") REFERENCES "galaxy_field_types"("id"),
        CONSTRAINT "FK_galaxy_fields_star_system" FOREIGN KEY ("starSystemId") REFERENCES "star_systems"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_galaxy_fields_region" FOREIGN KEY ("regionId") REFERENCES "map_regions"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_galaxy_fields_border_type" FOREIGN KEY ("borderTypeId") REFERENCES "border_types"("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_galaxy_fields_coords" UNIQUE ("layerId", "cx", "cy")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_galaxy_fields_star_system" ON "galaxy_fields" ("starSystemId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_galaxy_fields_faction_zone" ON "galaxy_fields" ("layerId", "factionZone")`,
    );

    // === Starmap: Celestial Objects ===
    await queryRunner.query(`
      CREATE TABLE "celestial_objects" (
        "id" SERIAL PRIMARY KEY,
        "systemId" integer NOT NULL,
        "objectType" integer NOT NULL,
        "name" varchar(255),
        "posX" integer NOT NULL,
        "posY" integer NOT NULL,
        "classId" integer,
        "isColonizable" boolean NOT NULL DEFAULT false,
        "surfaceWidth" integer,
        "surfaceHeight" integer,
        "terrainSeed" varchar(64),
        CONSTRAINT "FK_celestial_objects_system" FOREIGN KEY ("systemId") REFERENCES "star_systems"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_celestial_objects_system" ON "celestial_objects" ("systemId")`,
    );

    // === Starmap: System Fields ===
    await queryRunner.query(`
      CREATE TABLE "system_fields" (
        "id" SERIAL PRIMARY KEY,
        "starSystemId" integer NOT NULL,
        "sx" integer NOT NULL,
        "sy" integer NOT NULL,
        "fieldTypeId" integer NOT NULL,
        "celestialObjectId" integer,
        "isPassable" boolean NOT NULL DEFAULT true,
        "energyCost" integer NOT NULL DEFAULT 1,
        "damage" integer NOT NULL DEFAULT 0,
        "effects" text,
        "regionKey" varchar(64),
        "adminRegionKey" varchar(64),
        "influenceAreaId" integer,
        "borderMask" varchar(32),
        CONSTRAINT "FK_system_fields_star_system" FOREIGN KEY ("starSystemId") REFERENCES "star_systems"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_system_fields_field_type" FOREIGN KEY ("fieldTypeId") REFERENCES "galaxy_field_types"("id"),
        CONSTRAINT "FK_system_fields_celestial_object" FOREIGN KEY ("celestialObjectId") REFERENCES "celestial_objects"("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_system_fields_coords" UNIQUE ("starSystemId", "sx", "sy")
      )
    `);

    // === Starmap: Planet Fields ===
    await queryRunner.query(`
      CREATE TABLE "planet_fields" (
        "id" SERIAL PRIMARY KEY,
        "celestialObjectId" integer NOT NULL,
        "fieldLayer" varchar(16) NOT NULL,
        "px" integer NOT NULL,
        "py" integer NOT NULL,
        "fieldType" integer NOT NULL,
        "terrainTileId" integer NOT NULL,
        "buildingId" integer,
        "isBuildable" boolean NOT NULL DEFAULT true,
        "resourceModifier" integer NOT NULL DEFAULT 0,
        CONSTRAINT "FK_planet_fields_celestial_object" FOREIGN KEY ("celestialObjectId") REFERENCES "celestial_objects"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_planet_fields_coords" UNIQUE ("celestialObjectId", "fieldLayer", "px", "py")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_planet_fields_object_layer" ON "planet_fields" ("celestialObjectId", "fieldLayer")`,
    );

    // === Starmap: Exploration States ===
    await queryRunner.query(`
      CREATE TABLE "exploration_states" (
        "id" SERIAL PRIMARY KEY,
        "userId" integer NOT NULL,
        "layerId" integer NOT NULL,
        "cx" integer NOT NULL,
        "cy" integer NOT NULL,
        "explorationLevel" varchar(16) NOT NULL DEFAULT 'TERRAIN',
        "discoverySource" varchar(64),
        "discoveredAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_exploration_states_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_exploration_states_coords" UNIQUE ("userId", "layerId", "cx", "cy")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_exploration_states_user_layer" ON "exploration_states" ("userId", "layerId")`,
    );

    // === Starmap: System Explorations ===
    await queryRunner.query(`
      CREATE TABLE "system_explorations" (
        "id" SERIAL PRIMARY KEY,
        "userId" integer NOT NULL,
        "starSystemId" integer NOT NULL,
        "discoverySource" varchar(64),
        "discoveredAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_system_explorations_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_system_explorations_system" FOREIGN KEY ("starSystemId") REFERENCES "star_systems"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_system_explorations_user_system" UNIQUE ("userId", "starSystemId")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_system_explorations_user" ON "system_explorations" ("userId")`,
    );

    // === Starmap: Influence Areas ===
    await queryRunner.query(`
      CREATE TABLE "influence_areas" (
        "id" SERIAL PRIMARY KEY,
        "layerId" integer NOT NULL,
        "cx" integer NOT NULL,
        "cy" integer NOT NULL,
        "sourceType" varchar(16) NOT NULL,
        "sourceId" integer NOT NULL,
        "radius" integer NOT NULL DEFAULT 3,
        "strength" float NOT NULL DEFAULT 1.0,
        "calculatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_influence_areas_coords" ON "influence_areas" ("layerId", "cx", "cy")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_influence_areas_source" ON "influence_areas" ("sourceType", "sourceId")`,
    );

    // === Starmap: Wormholes ===
    await queryRunner.query(`
      CREATE TABLE "wormholes" (
        "id" SERIAL PRIMARY KEY,
        "entryLayerId" integer NOT NULL,
        "entryCx" integer NOT NULL,
        "entryCy" integer NOT NULL,
        "exitLayerId" integer NOT NULL,
        "exitCx" integer NOT NULL,
        "exitCy" integer NOT NULL,
        "isBidirectional" boolean NOT NULL DEFAULT false,
        "isRandomExit" boolean NOT NULL DEFAULT false,
        "name" varchar(128),
        "isActive" boolean NOT NULL DEFAULT true
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_wormholes_entry" ON "wormholes" ("entryLayerId", "entryCx", "entryCy")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_wormholes_exit" ON "wormholes" ("exitLayerId", "exitCx", "exitCy")`,
    );

    // === Colonies ===
    await queryRunner.query(`
      CREATE TABLE "colonies" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(255) NOT NULL,
        "userId" integer NOT NULL,
        "starSystemId" integer,
        "celestialObjectId" integer,
        "posX" integer NOT NULL DEFAULT 0,
        "posY" integer NOT NULL DEFAULT 0,
        "colonyClassId" integer NOT NULL,
        "energy" integer NOT NULL DEFAULT 0,
        "energyMax" integer NOT NULL DEFAULT 100,
        "population" integer NOT NULL DEFAULT 10,
        "populationMax" integer NOT NULL DEFAULT 100,
        "storageUsed" integer NOT NULL DEFAULT 0,
        "storageMax" integer NOT NULL DEFAULT 3000,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_colonies_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_colonies_star_system" FOREIGN KEY ("starSystemId") REFERENCES "star_systems"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_colonies_celestial_object" FOREIGN KEY ("celestialObjectId") REFERENCES "celestial_objects"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_colonies_user" ON "colonies" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_colonies_star_system" ON "colonies" ("starSystemId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "colony_fields" (
        "id" SERIAL PRIMARY KEY,
        "colonyId" integer NOT NULL,
        "fieldIndex" integer NOT NULL,
        "fieldType" integer NOT NULL,
        "terrainTileId" integer,
        "buildingId" integer,
        "isBuilding" boolean NOT NULL DEFAULT false,
        "buildProgress" integer NOT NULL DEFAULT 0,
        "buildFinishesAt" timestamp,
        CONSTRAINT "FK_colony_fields_colony" FOREIGN KEY ("colonyId") REFERENCES "colonies"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_colony_fields_index" UNIQUE ("colonyId", "fieldIndex")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "colony_storage" (
        "id" SERIAL PRIMARY KEY,
        "colonyId" integer NOT NULL,
        "commodityId" integer NOT NULL,
        "amount" integer NOT NULL DEFAULT 0,
        CONSTRAINT "FK_colony_storage_colony" FOREIGN KEY ("colonyId") REFERENCES "colonies"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_colony_storage_commodity" UNIQUE ("colonyId", "commodityId")
      )
    `);

    // === Spacecraft ===
    await queryRunner.query(`
      CREATE TABLE "ship_class_defs" (
        "id" SERIAL PRIMARY KEY,
        "key" varchar(64) NOT NULL UNIQUE,
        "name" varchar(255) NOT NULL,
        "category" varchar(64) NOT NULL,
        "role" varchar(64) NOT NULL,
        "factionId" integer,
        "buildTimeTicks" integer NOT NULL DEFAULT 0,
        "cargoCapacity" integer NOT NULL DEFAULT 0,
        "crewMin" integer NOT NULL DEFAULT 0,
        "crewMax" integer NOT NULL DEFAULT 0,
        "hullBase" integer NOT NULL DEFAULT 100,
        "shieldBase" integer NOT NULL DEFAULT 50,
        "epsBase" integer NOT NULL DEFAULT 100,
        "warpBase" integer NOT NULL DEFAULT 2,
        "batteryBase" integer NOT NULL DEFAULT 0,
        "starterAllowed" boolean NOT NULL DEFAULT false,
        "isNpc" boolean NOT NULL DEFAULT false
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "fleets" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(255) NOT NULL,
        "userId" integer NOT NULL,
        "leaderId" integer NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_fleets_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_fleets_user" ON "fleets" ("userId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "spacecraft" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(255) NOT NULL,
        "shipClassId" integer NOT NULL,
        "userId" integer NOT NULL,
        "starSystemId" integer,
        "currentLayerId" integer,
        "celestialObjectId" integer,
        "inSystem" boolean NOT NULL DEFAULT false,
        "currentSystemFieldX" integer,
        "currentSystemFieldY" integer,
        "posX" integer NOT NULL DEFAULT 10,
        "posY" integer NOT NULL DEFAULT 10,
        "status" varchar NOT NULL DEFAULT 'DOCKED',
        "alertState" varchar NOT NULL DEFAULT 'GREEN',
        "hull" integer NOT NULL DEFAULT 100,
        "hullMax" integer NOT NULL DEFAULT 100,
        "shields" integer NOT NULL DEFAULT 50,
        "shieldsMax" integer NOT NULL DEFAULT 50,
        "energy" integer NOT NULL DEFAULT 100,
        "energyMax" integer NOT NULL DEFAULT 100,
        "warpSpeed" integer NOT NULL DEFAULT 2,
        "warpCooldown" integer NOT NULL DEFAULT 0,
        "crew" integer NOT NULL DEFAULT 10,
        "crewMax" integer NOT NULL DEFAULT 20,
        "cargoUsed" integer NOT NULL DEFAULT 0,
        "cargoMax" integer NOT NULL DEFAULT 0,
        "battery" integer NOT NULL DEFAULT 0,
        "batteryMax" integer NOT NULL DEFAULT 0,
        "targetSystemId" integer,
        "targetX" integer,
        "targetY" integer,
        "arrivalAt" timestamp,
        "fleetId" integer,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_spacecraft_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_spacecraft_star_system" FOREIGN KEY ("starSystemId") REFERENCES "star_systems"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_spacecraft_layer" FOREIGN KEY ("currentLayerId") REFERENCES "layers"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_spacecraft_celestial_object" FOREIGN KEY ("celestialObjectId") REFERENCES "celestial_objects"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_spacecraft_fleet" FOREIGN KEY ("fleetId") REFERENCES "fleets"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_spacecraft_user" ON "spacecraft" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_spacecraft_star_system" ON "spacecraft" ("starSystemId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "spacecraft_modules" (
        "id" SERIAL PRIMARY KEY,
        "spacecraftId" integer NOT NULL,
        "moduleType" varchar(100) NOT NULL,
        "category" varchar(50) NOT NULL,
        "level" integer NOT NULL DEFAULT 1,
        "integrity" integer NOT NULL DEFAULT 100,
        "cooldown" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        CONSTRAINT "FK_spacecraft_modules_spacecraft" FOREIGN KEY ("spacecraftId") REFERENCES "spacecraft"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_spacecraft_modules_spacecraft" ON "spacecraft_modules" ("spacecraftId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "cargo_items" (
        "id" SERIAL PRIMARY KEY,
        "spacecraftId" integer NOT NULL,
        "commodityId" integer NOT NULL,
        "amount" integer NOT NULL DEFAULT 0,
        CONSTRAINT "FK_cargo_items_spacecraft" FOREIGN KEY ("spacecraftId") REFERENCES "spacecraft"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_cargo_items_spacecraft_commodity" UNIQUE ("spacecraftId", "commodityId")
      )
    `);

    // === Holonet ===
    await queryRunner.query(`
      CREATE TABLE "holonet_posts" (
        "id" SERIAL PRIMARY KEY,
        "authorId" integer NOT NULL,
        "title" varchar(255) NOT NULL,
        "body" text NOT NULL,
        "category" varchar NOT NULL DEFAULT 'NEWS',
        "isPinned" boolean NOT NULL DEFAULT false,
        "commentCount" integer NOT NULL DEFAULT 0,
        "rating" integer NOT NULL DEFAULT 0,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_holonet_posts_author" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_holonet_posts_category" ON "holonet_posts" ("category")`,
    );

    await queryRunner.query(`
      CREATE TABLE "holonet_comments" (
        "id" SERIAL PRIMARY KEY,
        "postId" integer NOT NULL,
        "authorId" integer NOT NULL,
        "body" varchar(250) NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_holonet_comments_post" FOREIGN KEY ("postId") REFERENCES "holonet_posts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_holonet_comments_author" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "holonet_ratings" (
        "id" SERIAL PRIMARY KEY,
        "postId" integer NOT NULL,
        "userId" integer NOT NULL,
        "value" integer NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_holonet_ratings_post" FOREIGN KEY ("postId") REFERENCES "holonet_posts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_holonet_ratings_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_holonet_ratings_post_user" UNIQUE ("postId", "userId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "holonet_checkpoints" (
        "userId" integer PRIMARY KEY,
        "lastReadPostId" integer NOT NULL DEFAULT 0,
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_holonet_checkpoints_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // === Messaging ===
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" SERIAL PRIMARY KEY,
        "senderId" integer NOT NULL,
        "recipientId" integer NOT NULL,
        "subject" varchar(255) NOT NULL,
        "body" text NOT NULL,
        "isRead" boolean NOT NULL DEFAULT false,
        "isSystem" boolean NOT NULL DEFAULT false,
        "deletedBySender" boolean NOT NULL DEFAULT false,
        "deletedByRecipient" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_messages_sender" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_messages_recipient" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_recipient_read" ON "messages" ("recipientId", "isRead")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_sender" ON "messages" ("senderId")`,
    );

    // === Onboarding ===
    await queryRunner.query(`
      CREATE TABLE "onboarding_selections" (
        "id" SERIAL PRIMARY KEY,
        "userId" integer NOT NULL UNIQUE,
        "factionId" integer,
        "selectedLayerId" integer,
        "selectedSectorX" integer,
        "selectedSectorY" integer,
        "selectedSystemId" integer,
        "selectedCelestialObjectId" integer,
        "status" varchar NOT NULL DEFAULT 'STARTED',
        "completedAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_onboarding_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_onboarding_faction" FOREIGN KEY ("factionId") REFERENCES "factions"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_onboarding_layer" FOREIGN KEY ("selectedLayerId") REFERENCES "layers"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_onboarding_system" FOREIGN KEY ("selectedSystemId") REFERENCES "star_systems"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_onboarding_celestial_object" FOREIGN KEY ("selectedCelestialObjectId") REFERENCES "celestial_objects"("id") ON DELETE SET NULL
      )
    `);

    // === Research ===
    await queryRunner.query(`
      CREATE TABLE "research" (
        "id" SERIAL PRIMARY KEY,
        "userId" integer NOT NULL,
        "techId" integer NOT NULL,
        "status" varchar NOT NULL DEFAULT 'LOCKED',
        "progress" integer NOT NULL DEFAULT 0,
        "finishesAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_research_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_research_user_tech" UNIQUE ("userId", "techId")
      )
    `);

    // === Settings ===
    await queryRunner.query(`
      CREATE TABLE "user_settings" (
        "userId" integer NOT NULL,
        "key" varchar(64) NOT NULL,
        "value" varchar(255) NOT NULL,
        CONSTRAINT "PK_user_settings" PRIMARY KEY ("userId", "key"),
        CONSTRAINT "FK_user_settings_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // === Tick ===
    await queryRunner.query(`
      CREATE TABLE "game_tick_states" (
        "id" SERIAL PRIMARY KEY,
        "tickNumber" bigint NOT NULL,
        "tickType" varchar NOT NULL,
        "scheduledFor" timestamp NOT NULL,
        "startedAt" timestamp,
        "completedAt" timestamp,
        "status" varchar NOT NULL DEFAULT 'STARTED',
        "lockKey" varchar,
        "error" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_game_tick_states_type_number" UNIQUE ("tickType", "tickNumber")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "game_tick_states" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_settings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "research" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "onboarding_selections" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "messages" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "holonet_checkpoints" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "holonet_ratings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "holonet_comments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "holonet_posts" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cargo_items" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "spacecraft_modules" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "spacecraft" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fleets" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ship_class_defs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "colony_storage" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "colony_fields" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "colonies" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "influence_areas" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wormholes" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "system_explorations" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "exploration_states" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "planet_fields" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "system_fields" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "celestial_objects" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "galaxy_fields" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "star_systems" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "map_regions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "border_types" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "galaxy_field_types" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "layers" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "faction_modifiers" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "factions" CASCADE`);
  }
}
