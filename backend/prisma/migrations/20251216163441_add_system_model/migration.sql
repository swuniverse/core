/*
  Warnings:

  - You are about to drop the column `fieldX` on the `Planet` table. All the data in the column will be lost.
  - You are about to drop the column `fieldY` on the `Planet` table. All the data in the column will be lost.
  - You are about to drop the column `sectorId` on the `Planet` table. All the data in the column will be lost.
  - Added the required column `systemId` to the `Planet` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Create System table first
CREATE TABLE "System" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sectorId" INTEGER NOT NULL,
    "systemType" TEXT NOT NULL,
    "fieldX" INTEGER NOT NULL,
    "fieldY" INTEGER NOT NULL,

    CONSTRAINT "System_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create unique index on System
CREATE UNIQUE INDEX "System_sectorId_fieldX_fieldY_key" ON "System"("sectorId", "fieldX", "fieldY");

-- Step 3: Add foreign key to System
ALTER TABLE "System" ADD CONSTRAINT "System_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 4: Create a temporary system for each existing planet location
INSERT INTO "System" ("name", "sectorId", "systemType", "fieldX", "fieldY")
SELECT 
    CONCAT('System ', "sectorId", '-', "fieldX", '-', "fieldY") as name,
    "sectorId",
    'SINGLE_STAR' as systemType,
    "fieldX",
    "fieldY"
FROM "Planet"
GROUP BY "sectorId", "fieldX", "fieldY";

-- Step 5: Add systemId column to Planet with temporary values
ALTER TABLE "Planet" ADD COLUMN "systemId" INTEGER;
ALTER TABLE "Planet" ADD COLUMN "orbitAngle" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Planet" ADD COLUMN "orbitRadius" INTEGER NOT NULL DEFAULT 3;

-- Step 6: Update Planet systemId based on sector/field coordinates
UPDATE "Planet" p
SET "systemId" = s.id
FROM "System" s
WHERE s."sectorId" = p."sectorId" 
  AND s."fieldX" = p."fieldX" 
  AND s."fieldY" = p."fieldY";

-- Step 7: Make systemId required
ALTER TABLE "Planet" ALTER COLUMN "systemId" SET NOT NULL;

-- Step 8: Drop old constraints and columns
ALTER TABLE "Planet" DROP CONSTRAINT "Planet_sectorId_fkey";
DROP INDEX "Planet_sectorId_fieldX_fieldY_key";

ALTER TABLE "Planet" DROP COLUMN "fieldX";
ALTER TABLE "Planet" DROP COLUMN "fieldY";
ALTER TABLE "Planet" DROP COLUMN "sectorId";

-- Step 9: Add new foreign key
ALTER TABLE "Planet" ADD CONSTRAINT "Planet_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
