/*
  Warnings:

  - You are about to drop the column `level` on the `PlayerResearch` table. All the data in the column will be lost.
  - You are about to drop the column `researchCost` on the `ResearchType` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PlayerResearch" DROP COLUMN "level",
ADD COLUMN     "currentProgress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ResearchType" DROP COLUMN "researchCost",
ADD COLUMN     "bonusType" TEXT,
ADD COLUMN     "bonusValue" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "requiredCreditsPerTick" INTEGER,
ADD COLUMN     "requiredCrystalPerTick" INTEGER,
ADD COLUMN     "requiredEnergyPerTick" INTEGER,
ADD COLUMN     "requiredLabCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "requiredMetalPerTick" INTEGER,
ADD COLUMN     "researchLevel" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "researchPointCost" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unlocksBuilding" TEXT,
ADD COLUMN     "unlocksBuildingId" INTEGER,
ADD COLUMN     "unlocksShip" TEXT,
ALTER COLUMN "researchTime" SET DEFAULT 0;
