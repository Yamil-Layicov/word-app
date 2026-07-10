-- CreateEnum
CREATE TYPE "ScheduledReviewInterval" AS ENUM ('ONE_HOUR', 'SIX_HOURS', 'ONE_DAY', 'THREE_DAYS', 'ONE_WEEK');

-- CreateEnum
CREATE TYPE "ScheduledReviewState" AS ENUM ('QUEUED', 'STARTED', 'DUE', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "UserWord" ADD COLUMN "masteryStep" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "UserWordSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userWordId" TEXT NOT NULL,
    "state" "ScheduledReviewState" NOT NULL DEFAULT 'QUEUED',
    "interval" "ScheduledReviewInterval" NOT NULL,
    "startedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWordSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserWordSchedule_userId_idx" ON "UserWordSchedule"("userId");

-- CreateIndex
CREATE INDEX "UserWordSchedule_userWordId_idx" ON "UserWordSchedule"("userWordId");

-- CreateIndex
CREATE INDEX "UserWordSchedule_state_idx" ON "UserWordSchedule"("state");

-- CreateIndex
CREATE INDEX "UserWordSchedule_dueAt_idx" ON "UserWordSchedule"("dueAt");

-- CreateIndex
CREATE INDEX "UserWordSchedule_userId_state_dueAt_idx" ON "UserWordSchedule"("userId", "state", "dueAt");

-- AddForeignKey
ALTER TABLE "UserWordSchedule" ADD CONSTRAINT "UserWordSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWordSchedule" ADD CONSTRAINT "UserWordSchedule_userWordId_fkey" FOREIGN KEY ("userWordId") REFERENCES "UserWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
