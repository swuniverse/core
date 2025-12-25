-- CreateTable
CREATE TABLE "ComnetMessage" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComnetMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComnetMessage_createdAt_idx" ON "ComnetMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "ComnetMessage" ADD CONSTRAINT "ComnetMessage_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
