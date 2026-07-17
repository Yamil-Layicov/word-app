-- CreateEnum
CREATE TYPE "DeckPurpose" AS ENUM ('LEARNING', 'MASTERED_COLLECTION');

-- AlterTable
ALTER TABLE "Deck"
ADD COLUMN "purpose" "DeckPurpose" NOT NULL DEFAULT 'LEARNING';

-- CreateIndex
CREATE INDEX "Deck_userId_languagePairId_purpose_idx"
ON "Deck"("userId", "languagePairId", "purpose");
