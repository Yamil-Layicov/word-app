-- CreateEnum
CREATE TYPE "ScheduledReviewAnswerResult" AS ENUM ('INCORRECT', 'CORRECT', 'KNOWN');

-- AlterTable
ALTER TABLE "UserWordSchedule"
ADD COLUMN "answerResult" "ScheduledReviewAnswerResult";
