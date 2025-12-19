/*
  Warnings:

  - Added the required column `playerId` to the `Ship` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: Add column as nullable first
ALTER TABLE "Ship" ADD COLUMN "playerId" INTEGER;

-- Update all ships with the player ID (from planet owner or first player)
UPDATE "Ship" s
SET "playerId" = COALESCE(
  (SELECT p."playerId" FROM "Planet" p WHERE p.id = s."planetId"),
  (SELECT id FROM "Player" LIMIT 1)
);

-- Now make it NOT NULL
ALTER TABLE "Ship" ALTER COLUMN "playerId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Ship" ADD CONSTRAINT "Ship_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
