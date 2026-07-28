ALTER TABLE "UserWordSchedule"
ADD COLUMN "dueNotificationClaimId" TEXT,
ADD COLUMN "dueNotificationClaimedAt" TIMESTAMP(3),
ADD COLUMN "dueNotificationSentAt" TIMESTAMP(3),
ADD COLUMN "dueNotificationAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "dueNotificationLastError" TEXT;

CREATE INDEX "UserWordSchedule_due_notification_scan_idx"
ON "UserWordSchedule"("state", "dueNotificationSentAt", "dueAt");
