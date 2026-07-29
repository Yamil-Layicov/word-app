-- AlterTable
ALTER TABLE "PasswordResetToken"
ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "PasswordResetToken"
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL;

ALTER TABLE "PasswordResetToken"
ALTER COLUMN "updatedAt" SET NOT NULL;

-- DropIndex
DROP INDEX "PasswordResetToken_userId_expiresAt_idx";

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_userId_key" ON "PasswordResetToken"("userId");
