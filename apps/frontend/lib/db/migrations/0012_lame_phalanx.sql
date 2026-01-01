ALTER TABLE "Chat" ADD COLUMN "forkedFromChatId" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_message_chat_id" ON "Message" USING btree ("chatId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_message_chat_id_created_at" ON "Message" USING btree ("chatId","createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vote_chat_id" ON "Vote" USING btree ("chatId");