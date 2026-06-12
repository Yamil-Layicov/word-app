-- CreateEnum
CREATE TYPE "PracticeMode" AS ENUM ('FLASHCARD', 'TYPING', 'MULTIPLE_CHOICE', 'OTHER');

-- CreateTable
CREATE TABLE "PracticeLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userWordId" TEXT NOT NULL,
    "vocabularyItemId" TEXT NOT NULL,
    "practiceMode" "PracticeMode" NOT NULL DEFAULT 'FLASHCARD',
    "isCorrect" BOOLEAN NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PracticeLog_userId_answeredAt_idx" ON "PracticeLog"("userId", "answeredAt");

-- CreateIndex
CREATE INDEX "PracticeLog_userWordId_answeredAt_idx" ON "PracticeLog"("userWordId", "answeredAt");

-- CreateIndex
CREATE INDEX "PracticeLog_vocabularyItemId_answeredAt_idx" ON "PracticeLog"("vocabularyItemId", "answeredAt");

-- AddForeignKey
ALTER TABLE "PracticeLog" ADD CONSTRAINT "PracticeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeLog" ADD CONSTRAINT "PracticeLog_userWordId_fkey" FOREIGN KEY ("userWordId") REFERENCES "UserWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeLog" ADD CONSTRAINT "PracticeLog_vocabularyItemId_fkey" FOREIGN KEY ("vocabularyItemId") REFERENCES "VocabularyItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
