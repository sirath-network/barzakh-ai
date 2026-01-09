CREATE TABLE IF NOT EXISTS "RelaySwapTracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"swapRequestId" varchar(256) NOT NULL,
	"transactionHash" varchar(66),
	"completedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "RelaySwapTracking_swapRequestId_unique" UNIQUE("swapRequestId")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "RelaySwapTracking" ADD CONSTRAINT "RelaySwapTracking_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
