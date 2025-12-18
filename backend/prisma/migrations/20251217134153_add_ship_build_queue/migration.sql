-- AlterTable
ALTER TABLE "Ship" ADD COLUMN     "planetId" INTEGER;

-- CreateTable
CREATE TABLE "ShipBuildQueue" (
    "id" SERIAL NOT NULL,
    "planetId" INTEGER NOT NULL,
    "shipTypeId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "constructionStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ShipBuildQueue_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Ship" ADD CONSTRAINT "Ship_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "Planet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipBuildQueue" ADD CONSTRAINT "ShipBuildQueue_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "Planet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipBuildQueue" ADD CONSTRAINT "ShipBuildQueue_shipTypeId_fkey" FOREIGN KEY ("shipTypeId") REFERENCES "ShipType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
