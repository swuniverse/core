-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "factionId" INTEGER NOT NULL,
    "allianceId" INTEGER,
    "credits" INTEGER NOT NULL DEFAULT 1000,
    "metal" INTEGER NOT NULL DEFAULT 0,
    "crystal" INTEGER NOT NULL DEFAULT 0,
    "energy" INTEGER NOT NULL DEFAULT 0,
    "maxEnergy" INTEGER NOT NULL DEFAULT 0,
    "storageCapacity" INTEGER NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faction" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Faction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alliance" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "founderId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Galaxy" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sizeX" INTEGER NOT NULL,
    "sizeY" INTEGER NOT NULL,

    CONSTRAINT "Galaxy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" SERIAL NOT NULL,
    "galaxyId" INTEGER NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "sectorType" TEXT NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Planet" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sectorId" INTEGER NOT NULL,
    "playerId" INTEGER,
    "planetType" TEXT NOT NULL,
    "sizeX" INTEGER NOT NULL DEFAULT 10,
    "sizeY" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "Planet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanetField" (
    "id" SERIAL NOT NULL,
    "planetId" INTEGER NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "fieldType" TEXT NOT NULL,
    "buildingId" INTEGER,

    CONSTRAINT "PlanetField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildingType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "buildCost" INTEGER NOT NULL,
    "buildTime" INTEGER NOT NULL,
    "energyCost" INTEGER NOT NULL,
    "requiredResearch" INTEGER,

    CONSTRAINT "BuildingType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" SERIAL NOT NULL,
    "planetId" INTEGER NOT NULL,
    "buildingTypeId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "researchCost" INTEGER NOT NULL,
    "researchTime" INTEGER NOT NULL,
    "prerequisiteId" INTEGER,

    CONSTRAINT "ResearchType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerResearch" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "researchTypeId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PlayerResearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shipClass" TEXT NOT NULL,
    "buildCost" INTEGER NOT NULL,
    "buildTime" INTEGER NOT NULL,
    "crewRequired" INTEGER NOT NULL,
    "cargoCapacity" INTEGER NOT NULL,
    "fuelCapacity" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,
    "requiredResearch" INTEGER,

    CONSTRAINT "ShipType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ship" (
    "id" SERIAL NOT NULL,
    "fleetId" INTEGER,
    "shipTypeId" INTEGER NOT NULL,
    "name" TEXT,
    "health" INTEGER NOT NULL DEFAULT 100,
    "crew" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Ship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fleet" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sectorId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'IDLE',

    CONSTRAINT "Fleet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StartPlanet" (
    "id" SERIAL NOT NULL,
    "factionId" INTEGER NOT NULL,
    "planetName" TEXT NOT NULL,
    "sectorX" INTEGER NOT NULL,
    "sectorY" INTEGER NOT NULL,

    CONSTRAINT "StartPlanet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameTick" (
    "id" SERIAL NOT NULL,
    "tickNumber" INTEGER NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameTick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Player_userId_key" ON "Player"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Faction_name_key" ON "Faction"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Alliance_name_key" ON "Alliance"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Alliance_tag_key" ON "Alliance"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_galaxyId_x_y_key" ON "Sector"("galaxyId", "x", "y");

-- CreateIndex
CREATE UNIQUE INDEX "PlanetField_planetId_x_y_key" ON "PlanetField"("planetId", "x", "y");

-- CreateIndex
CREATE UNIQUE INDEX "BuildingType_name_key" ON "BuildingType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchType_name_key" ON "ResearchType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerResearch_playerId_researchTypeId_key" ON "PlayerResearch"("playerId", "researchTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "ShipType_name_key" ON "ShipType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StartPlanet_factionId_sectorX_sectorY_key" ON "StartPlanet"("factionId", "sectorX", "sectorY");

-- CreateIndex
CREATE UNIQUE INDEX "GameTick_tickNumber_key" ON "GameTick"("tickNumber");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sector" ADD CONSTRAINT "Sector_galaxyId_fkey" FOREIGN KEY ("galaxyId") REFERENCES "Galaxy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planet" ADD CONSTRAINT "Planet_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planet" ADD CONSTRAINT "Planet_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanetField" ADD CONSTRAINT "PlanetField_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "Planet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanetField" ADD CONSTRAINT "PlanetField_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "Planet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_buildingTypeId_fkey" FOREIGN KEY ("buildingTypeId") REFERENCES "BuildingType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchType" ADD CONSTRAINT "ResearchType_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "ResearchType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerResearch" ADD CONSTRAINT "PlayerResearch_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerResearch" ADD CONSTRAINT "PlayerResearch_researchTypeId_fkey" FOREIGN KEY ("researchTypeId") REFERENCES "ResearchType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ship" ADD CONSTRAINT "Ship_fleetId_fkey" FOREIGN KEY ("fleetId") REFERENCES "Fleet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ship" ADD CONSTRAINT "Ship_shipTypeId_fkey" FOREIGN KEY ("shipTypeId") REFERENCES "ShipType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fleet" ADD CONSTRAINT "Fleet_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StartPlanet" ADD CONSTRAINT "StartPlanet_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
