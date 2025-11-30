CREATE TABLE IF NOT EXISTS "X402Transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"transactionHash" varchar(66) NOT NULL,
	"chainId" integer NOT NULL,
	"amount" varchar(64) NOT NULL,
	"tokenAddress" varchar(42),
	"senderAddress" varchar(42),
	"planId" varchar(64) NOT NULL,
	"billingCycle" varchar(32) DEFAULT 'monthly' NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "X402Transaction_transactionHash_unique" UNIQUE("transactionHash")
);
--> statement-breakpoint
ALTER TABLE "User" ALTER COLUMN "dailyMessageRemaining" SET DEFAULT 20;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN "billingCycle" varchar(32) DEFAULT 'monthly' NOT NULL;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN "x402CancelAtPeriodEnd" boolean DEFAULT false NOT NULL;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "X402Transaction" ADD CONSTRAINT "X402Transaction_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
