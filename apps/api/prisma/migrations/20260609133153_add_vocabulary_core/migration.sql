-- CreateEnum
CREATE TYPE "WordType" AS ENUM ('NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PHRASE', 'IDIOM', 'PHRASAL_VERB', 'SENTENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "UserWordStatus" AS ENUM ('NEW', 'LEARNING', 'REVIEWING', 'MASTERED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReviewRating" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');

-- CreateTable
CREATE TABLE "VocabularyItem" (
    "id" TEXT NOT NULL,
    "languagePairId" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "targetText" TEXT NOT NULL,
    "sourceNormalized" TEXT NOT NULL,
    "targetNormalized" TEXT NOT NULL,
    "wordType" "WordType" NOT NULL DEFAULT 'OTHER',
    "cefrLevel" "CefrLevel",
    "definition" TEXT,
    "note" TEXT,
    "visibility" "AudienceScope" NOT NULL DEFAULT 'PRIVATE',
    "createdByUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyExample" (
    "id" TEXT NOT NULL,
    "vocabularyItemId" TEXT NOT NULL,
    "sourceSentence" TEXT NOT NULL,
    "targetSentence" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularyExample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vocabularyItemId" TEXT NOT NULL,
    "status" "UserWordStatus" NOT NULL DEFAULT 'NEW',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "lastReviewedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userWordId" TEXT NOT NULL,
    "vocabularyItemId" TEXT NOT NULL,
    "rating" "ReviewRating" NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VocabularyItem_languagePairId_idx" ON "VocabularyItem"("languagePairId");

-- CreateIndex
CREATE INDEX "VocabularyItem_createdByUserId_idx" ON "VocabularyItem"("createdByUserId");

-- CreateIndex
CREATE INDEX "VocabularyItem_wordType_idx" ON "VocabularyItem"("wordType");

-- CreateIndex
CREATE INDEX "VocabularyItem_cefrLevel_idx" ON "VocabularyItem"("cefrLevel");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyItem_languagePairId_sourceNormalized_targetNormal_key" ON "VocabularyItem"("languagePairId", "sourceNormalized", "targetNormalized");

-- CreateIndex
CREATE INDEX "VocabularyExample_vocabularyItemId_idx" ON "VocabularyExample"("vocabularyItemId");

-- CreateIndex
CREATE INDEX "UserWord_userId_idx" ON "UserWord"("userId");

-- CreateIndex
CREATE INDEX "UserWord_vocabularyItemId_idx" ON "UserWord"("vocabularyItemId");

-- CreateIndex
CREATE INDEX "UserWord_status_idx" ON "UserWord"("status");

-- CreateIndex
CREATE INDEX "UserWord_nextReviewAt_idx" ON "UserWord"("nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserWord_userId_vocabularyItemId_key" ON "UserWord"("userId", "vocabularyItemId");

-- CreateIndex
CREATE INDEX "ReviewLog_userId_idx" ON "ReviewLog"("userId");

-- CreateIndex
CREATE INDEX "ReviewLog_userWordId_idx" ON "ReviewLog"("userWordId");

-- CreateIndex
CREATE INDEX "ReviewLog_vocabularyItemId_idx" ON "ReviewLog"("vocabularyItemId");

-- CreateIndex
CREATE INDEX "ReviewLog_answeredAt_idx" ON "ReviewLog"("answeredAt");

-- AddForeignKey
ALTER TABLE "VocabularyItem" ADD CONSTRAINT "VocabularyItem_languagePairId_fkey" FOREIGN KEY ("languagePairId") REFERENCES "LanguagePair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyItem" ADD CONSTRAINT "VocabularyItem_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyExample" ADD CONSTRAINT "VocabularyExample_vocabularyItemId_fkey" FOREIGN KEY ("vocabularyItemId") REFERENCES "VocabularyItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWord" ADD CONSTRAINT "UserWord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWord" ADD CONSTRAINT "UserWord_vocabularyItemId_fkey" FOREIGN KEY ("vocabularyItemId") REFERENCES "VocabularyItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_userWordId_fkey" FOREIGN KEY ("userWordId") REFERENCES "UserWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_vocabularyItemId_fkey" FOREIGN KEY ("vocabularyItemId") REFERENCES "VocabularyItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
