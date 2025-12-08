-- Add updatedAt column to Chat table for tracking recent activity
-- Use NOW() as default for new rows and backfill existing rows
ALTER TABLE "Chat" ADD COLUMN "updatedAt" timestamp DEFAULT NOW() NOT NULL;

-- Backfill existing chats with their createdAt value  
UPDATE "Chat" SET "updatedAt" = "createdAt";
