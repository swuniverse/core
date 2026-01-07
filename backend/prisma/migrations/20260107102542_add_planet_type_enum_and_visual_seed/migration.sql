/*
  Warnings:

  - The `planetType` column on the `Planet` table is converted from String to Enum. Data is preserved and mapped.

*/

-- CreateEnum
CREATE TYPE "PlanetType" AS ENUM ('DESERT', 'ICE', 'FOREST', 'CITY', 'VOLCANO', 'JUNGLE', 'VOLCANIC', 'TERRAN');

-- Add visualSeed column
ALTER TABLE "Planet" ADD COLUMN "visualSeed" INTEGER;

-- Update existing data to set visualSeed to 1 for all planets
UPDATE "Planet" SET "visualSeed" = 1 WHERE "visualSeed" IS NULL;

-- Create temporary column for migration
ALTER TABLE "Planet" ADD COLUMN "planetType_new" "PlanetType";

-- Migrate data: Convert string values to enum, handle any variations
UPDATE "Planet" 
SET "planetType_new" = CASE 
  WHEN UPPER("planetType") = 'DESERT' THEN 'DESERT'::"PlanetType"
  WHEN UPPER("planetType") = 'ICE' THEN 'ICE'::"PlanetType"
  WHEN UPPER("planetType") = 'FOREST' THEN 'FOREST'::"PlanetType"
  WHEN UPPER("planetType") = 'CITY' THEN 'CITY'::"PlanetType"
  WHEN UPPER("planetType") = 'VOLCANO' OR UPPER("planetType") = 'VOLCANIC' THEN 'VOLCANO'::"PlanetType"
  WHEN UPPER("planetType") = 'JUNGLE' THEN 'JUNGLE'::"PlanetType"
  WHEN UPPER("planetType") = 'TERRAN' THEN 'TERRAN'::"PlanetType"
  ELSE 'TERRAN'::"PlanetType"  -- Default fallback
END;

-- Drop old column
ALTER TABLE "Planet" DROP COLUMN "planetType";

-- Rename new column
ALTER TABLE "Planet" RENAME COLUMN "planetType_new" TO "planetType";

-- Set NOT NULL constraint with default
ALTER TABLE "Planet" ALTER COLUMN "planetType" SET NOT NULL;
ALTER TABLE "Planet" ALTER COLUMN "planetType" SET DEFAULT 'TERRAN'::"PlanetType";
