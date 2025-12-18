/*
  Warnings:

  - A unique constraint covering the columns `[planetName]` on the table `StartPlanet` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "StartPlanet_factionId_sectorX_sectorY_key";

-- CreateIndex
CREATE UNIQUE INDEX "StartPlanet_planetName_key" ON "StartPlanet"("planetName");
