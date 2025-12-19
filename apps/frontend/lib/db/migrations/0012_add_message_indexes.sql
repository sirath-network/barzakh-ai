-- Add performance index on Message.chatId for faster lookups
-- This speeds up getMessagesByChatId queries significantly
CREATE INDEX IF NOT EXISTS "Message_chatId_idx" ON "Message" ("chatId");

-- Add index on Message.createdAt for faster ordering
CREATE INDEX IF NOT EXISTS "Message_createdAt_idx" ON "Message" ("createdAt");

-- Composite index for the most common query pattern (chatId + createdAt)
CREATE INDEX IF NOT EXISTS "Message_chatId_createdAt_idx" ON "Message" ("chatId", "createdAt");
