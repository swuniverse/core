/*
  Warnings:

  - You are about to drop the column `buildCostCrystal` on the `BuildingType` table. All the data in the column will be lost.
  - You are about to drop the column `buildCostMetal` on the `BuildingType` table. All the data in the column will be lost.
  - You are about to drop the column `crystalProduction` on the `BuildingType` table. All the data in the column will be lost.
  - You are about to drop the column `metalProduction` on the `BuildingType` table. All the data in the column will be lost.
  - You are about to drop the column `crystal` on the `Planet` table. All the data in the column will be lost.
  - You are about to drop the column `metal` on the `Planet` table. All the data in the column will be lost.
  - You are about to drop the column `requiredCrystalPerTick` on the `ResearchType` table. All the data in the column will be lost.
  - You are about to drop the column `requiredCrystalTotal` on the `ResearchType` table. All the data in the column will be lost.
  - You are about to drop the column `requiredMetalPerTick` on the `ResearchType` table. All the data in the column will be lost.
  - You are about to drop the column `requiredMetalTotal` on the `ResearchType` table. All the data in the column will be lost.

*/

-- Step 1: Add new columns to BuildingType
ALTER TABLE "BuildingType" 
ADD COLUMN "buildCostDurastahl" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "buildCostKristallinesSilizium" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "buildCostTibannaGas" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "buildCostEnergiemodule" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "buildCostKyberKristalle" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "buildCostBacta" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "buildCostBeskar" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "durastahlProduction" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "kristallinesSiliziumProduction" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "tibannaGasProduction" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "energiemoduleProduction" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "kyberKristalleProduction" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "bactaProduction" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "beskarProduction" INTEGER NOT NULL DEFAULT 0;

-- Step 2: Migrate existing BuildingType data
UPDATE "BuildingType" SET "buildCostDurastahl" = "buildCostMetal";
UPDATE "BuildingType" SET "buildCostKristallinesSilizium" = "buildCostCrystal";
UPDATE "BuildingType" SET "durastahlProduction" = "metalProduction";
UPDATE "BuildingType" SET "kristallinesSiliziumProduction" = "crystalProduction";

-- Step 3: Drop old BuildingType columns
ALTER TABLE "BuildingType" 
DROP COLUMN "buildCostMetal",
DROP COLUMN "buildCostCrystal",
DROP COLUMN "metalProduction",
DROP COLUMN "crystalProduction";

-- Step 4: Add new columns to Planet
ALTER TABLE "Planet" 
ADD COLUMN "durastahl" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "kristallinesSilizium" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "tibannaGas" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "energiemodule" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "kyberKristalle" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "bacta" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "beskar" INTEGER NOT NULL DEFAULT 0;

-- Step 5: Migrate existing Planet data
UPDATE "Planet" SET "durastahl" = "metal";
UPDATE "Planet" SET "kristallinesSilizium" = "crystal";

-- Step 6: Drop old Planet columns
ALTER TABLE "Planet" 
DROP COLUMN "metal",
DROP COLUMN "crystal";

-- Step 7: Update ResearchType
ALTER TABLE "ResearchType" 
ADD COLUMN "requiredDurastahlPerTick" INTEGER,
ADD COLUMN "requiredDurastahlTotal" INTEGER,
ADD COLUMN "requiredKristallinesSiliziumPerTick" INTEGER,
ADD COLUMN "requiredKristallinesSiliziumTotal" INTEGER;

-- Step 8: Migrate ResearchType data
UPDATE "ResearchType" SET "requiredDurastahlPerTick" = "requiredMetalPerTick" WHERE "requiredMetalPerTick" IS NOT NULL;
UPDATE "ResearchType" SET "requiredDurastahlTotal" = "requiredMetalTotal" WHERE "requiredMetalTotal" IS NOT NULL;
UPDATE "ResearchType" SET "requiredKristallinesSiliziumPerTick" = "requiredCrystalPerTick" WHERE "requiredCrystalPerTick" IS NOT NULL;
UPDATE "ResearchType" SET "requiredKristallinesSiliziumTotal" = "requiredCrystalTotal" WHERE "requiredCrystalTotal" IS NOT NULL;

-- Step 9: Drop old ResearchType columns
ALTER TABLE "ResearchType" 
DROP COLUMN "requiredMetalPerTick",
DROP COLUMN "requiredMetalTotal",
DROP COLUMN "requiredCrystalPerTick",
DROP COLUMN "requiredCrystalTotal";

