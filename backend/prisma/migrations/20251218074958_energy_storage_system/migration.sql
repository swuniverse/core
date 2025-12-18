/*
  Warnings:

  - You are about to drop the column `energyCost` on the `BuildingType` table. All the data in the column will be lost.
  - You are about to drop the column `energy` on the `Planet` table. All the data in the column will be lost.
  - You are about to drop the column `maxEnergy` on the `Planet` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BuildingType" DROP COLUMN "energyCost",
ADD COLUMN     "energyCostPerTick" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "energyCostToBuild" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Planet" DROP COLUMN "energy",
DROP COLUMN "maxEnergy",
ADD COLUMN     "energyStorage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "energyStorageCapacity" INTEGER NOT NULL DEFAULT 1000;
