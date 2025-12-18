-- DropForeignKey
ALTER TABLE "InviteCode" DROP CONSTRAINT "InviteCode_createdById_fkey";

-- AlterTable
ALTER TABLE "InviteCode" ALTER COLUMN "createdById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
