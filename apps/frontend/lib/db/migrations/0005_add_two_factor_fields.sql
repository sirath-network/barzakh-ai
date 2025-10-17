ALTER TABLE "User" ADD COLUMN "twoFactorSecret" text;
ALTER TABLE "User" ADD COLUMN "twoFactorEnabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "User" ADD COLUMN "backupCodes" text;
