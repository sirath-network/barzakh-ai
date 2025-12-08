-- Add updatedAt column to Chat table for tracking recent activity
-- Use NOW() as default for new rows and backfill existing rows
-- This migration is idempotent (safe to run multiple times)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Chat' AND column_name = 'updatedAt') THEN
        ALTER TABLE "Chat" ADD COLUMN "updatedAt" timestamp DEFAULT NOW() NOT NULL;
        -- Backfill existing chats with their createdAt value  
        UPDATE "Chat" SET "updatedAt" = "createdAt";
    END IF;
END$$;
