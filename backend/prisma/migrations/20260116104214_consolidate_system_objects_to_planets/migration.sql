-- Migration to consolidate SystemObjects into Planets with celestialType=ASTEROID_FIELD
-- This removes the SystemObjectType enum and SystemObject table
-- Converting all existing SystemObjects to Planet records

-- First, add the asteroidVariant column to Planet table
ALTER TABLE "Planet" ADD COLUMN "asteroidVariant" TEXT;

-- Convert existing SystemObjects to Planets with celestialType=ASTEROID_FIELD
INSERT INTO "Planet" (
  "name",
  "systemId",
  "planetClass",
  "visualSeed",
  "gridX",
  "gridY",
  "celestialType",
  "asteroidVariant",
  "durastahl",
  "kristallinesSilizium",
  "sizeX",
  "sizeY",
  "credits",
  "tibannaGas",
  "energiemodule",
  "kyberKristalle",
  "bacta",
  "beskar",
  "energyStorage",
  "energyStorageCapacity",
  "storageCapacity"
)
SELECT
  "name",
  "systemId",
  'CLASS_K',                    -- Default rocky asteroid class
  COALESCE("visualSeed", 1),
  "gridX",
  "gridY",
  'ASTEROID_FIELD',             -- celestialType
  -- Map objectType to asteroidVariant
  CASE
    WHEN "objectType" = 'ASTEROID_FIELD' THEN 'NORMAL'
    ELSE 'NORMAL'  -- All legacy types become NORMAL asteroids
  END,
  "durastahl",
  "kristallinesSilizium",
  10,                           -- Default sizeX
  10,                           -- Default sizeY
  0,                            -- No credits for asteroid fields
  0,                            -- No tibannaGas
  0,                            -- No energiemodule
  0,                            -- No kyberKristalle
  0,                            -- No bacta
  0,                            -- No beskar
  0,                            -- No energyStorage
  1000,                         -- Default energyStorageCapacity
  500                           -- Default storageCapacity
FROM "SystemObject"
WHERE "objectType" = 'ASTEROID_FIELD';  -- Only convert ASTEROID_FIELD objects

-- Log the legacy objects that are being discarded (for debugging)
-- These had no real assets anyway: DEBRIS_FIELD, SPACE_STATION, WORMHOLE, NEBULA_PATCH

-- Drop the SystemObject table
DROP TABLE "SystemObject";

-- Drop the SystemObjectType enum
DROP TYPE "SystemObjectType";

-- Remove the systemObjects relation from the System table
-- (This was already done in the schema update, no SQL needed)

-- Update any existing Planet records that might have been ASTEROID_FIELD without asteroidVariant
UPDATE "Planet"
SET "asteroidVariant" = 'NORMAL'
WHERE "celestialType" = 'ASTEROID_FIELD' AND "asteroidVariant" IS NULL;