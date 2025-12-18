-- AlterTable
ALTER TABLE "ShipType" ADD COLUMN     "buildCostBacta" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "buildCostBeskar" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "buildCostDurastahl" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "buildCostEnergiemodule" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "buildCostKristallinesSilizium" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "buildCostKyberKristalle" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "buildCostTibannaGas" INTEGER NOT NULL DEFAULT 0;
