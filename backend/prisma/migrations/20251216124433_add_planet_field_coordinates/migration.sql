/*
  Warnings:

  - A unique constraint covering the columns `[sectorId,fieldX,fieldY]` on the table `Planet` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fieldX` to the `Planet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fieldY` to the `Planet` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Planet" ADD COLUMN     "fieldX" INTEGER NOT NULL,
ADD COLUMN     "fieldY" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Planet_sectorId_fieldX_fieldY_key" ON "Planet"("sectorId", "fieldX", "fieldY");
