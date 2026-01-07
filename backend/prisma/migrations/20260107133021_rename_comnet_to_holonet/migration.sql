-- Rename ComnetMessage table to HoloNetMessage
ALTER TABLE "ComnetMessage" RENAME TO "HoloNetMessage";

-- Rename the primary key index
ALTER INDEX "ComnetMessage_pkey" RENAME TO "HoloNetMessage_pkey";
