-- Move resources from Player to Planet (STU-style)

-- Add resource columns to Planet
ALTER TABLE "Planet" ADD COLUMN "credits" INTEGER NOT NULL DEFAULT 10000;
ALTER TABLE "Planet" ADD COLUMN "metal" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Planet" ADD COLUMN "crystal" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Planet" ADD COLUMN "energy" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Planet" ADD COLUMN "maxEnergy" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Planet" ADD COLUMN "storageCapacity" INTEGER NOT NULL DEFAULT 500;

-- Drop resource columns from Player (they're now planet-specific)
ALTER TABLE "Player" DROP COLUMN "credits";
ALTER TABLE "Player" DROP COLUMN "metal";
ALTER TABLE "Player" DROP COLUMN "crystal";
ALTER TABLE "Player" DROP COLUMN "energy";
ALTER TABLE "Player" DROP COLUMN "maxEnergy";
ALTER TABLE "Player" DROP COLUMN "storageCapacity";
