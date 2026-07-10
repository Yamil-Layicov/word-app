-- CreateTable
CREATE TABLE "Deck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "languagePairId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeckCard" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "userWordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeckCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deck_userId_idx" ON "Deck"("userId");

-- CreateIndex
CREATE INDEX "Deck_languagePairId_idx" ON "Deck"("languagePairId");

-- CreateIndex
CREATE INDEX "Deck_userId_languagePairId_idx" ON "Deck"("userId", "languagePairId");

-- CreateIndex
CREATE INDEX "Deck_userId_languagePairId_isDefault_idx" ON "Deck"("userId", "languagePairId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "DeckCard_deckId_userWordId_key" ON "DeckCard"("deckId", "userWordId");

-- CreateIndex
CREATE INDEX "DeckCard_deckId_idx" ON "DeckCard"("deckId");

-- CreateIndex
CREATE INDEX "DeckCard_userWordId_idx" ON "DeckCard"("userWordId");

-- AddForeignKey
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_languagePairId_fkey" FOREIGN KEY ("languagePairId") REFERENCES "LanguagePair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckCard" ADD CONSTRAINT "DeckCard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckCard" ADD CONSTRAINT "DeckCard_userWordId_fkey" FOREIGN KEY ("userWordId") REFERENCES "UserWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
