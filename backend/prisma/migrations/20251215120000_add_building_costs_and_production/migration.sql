-- AlterTable: BuildingType - Add new cost and production fields
ALTER TABLE "BuildingType" ADD COLUMN "buildCostCredits" INTEGER;
ALTER TABLE "BuildingType" ADD COLUMN "buildCostMetal" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BuildingType" ADD COLUMN "buildCostCrystal" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BuildingType" ADD COLUMN "energyProduction" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BuildingType" ADD COLUMN "metalProduction" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BuildingType" ADD COLUMN "crystalProduction" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BuildingType" ADD COLUMN "creditProduction" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BuildingType" ADD COLUMN "storageBonus" INTEGER NOT NULL DEFAULT 0;

-- Migrate existing buildCost to buildCostCredits
UPDATE "BuildingType" SET "buildCostCredits" = "buildCost";

-- Make buildCostCredits required after data migration
ALTER TABLE "BuildingType" ALTER COLUMN "buildCostCredits" SET NOT NULL;

-- Drop old buildCost column
ALTER TABLE "BuildingType" DROP COLUMN "buildCost";

-- AlterTable: Building - Add construction tracking fields
ALTER TABLE "Building" ADD COLUMN "constructionStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Building" ALTER COLUMN "isActive" SET DEFAULT false;

-- Update existing buildings to be active and completed
UPDATE "Building" SET "isActive" = true, "completedAt" = CURRENT_TIMESTAMP WHERE "completedAt" IS NULL;

-- Set production values for existing building types
UPDATE "BuildingType" SET 
  "creditProduction" = 100,
  "buildCostCredits" = 500,
  "buildTime" = 2
WHERE "name" = 'Command Center';

UPDATE "BuildingType" SET 
  "energyProduction" = 50,
  "buildCostCredits" = 300,
  "buildCostMetal" = 100,
  "buildTime" = 1
WHERE "name" = 'Solar Plant';

UPDATE "BuildingType" SET 
  "metalProduction" = 30,
  "energyCost" = 10,
  "buildCostCredits" = 400,
  "buildCostMetal" = 50,
  "buildTime" = 2
WHERE "name" = 'Metal Mine';

UPDATE "BuildingType" SET 
  "crystalProduction" = 20,
  "energyCost" = 15,
  "buildCostCredits" = 500,
  "buildCostMetal" = 100,
  "buildCostCrystal" = 50,
  "buildTime" = 3
WHERE "name" = 'Crystal Harvester';
