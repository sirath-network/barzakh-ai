CREATE TABLE "AgentDelegation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"walletId" varchar(255) NOT NULL,
	"walletApiKey" text NOT NULL,
	"keyShare" text,
	"walletAddress" varchar(128) NOT NULL,
	"chain" varchar(64) NOT NULL,
	"delegatedAt" timestamp DEFAULT now() NOT NULL,
	"revokedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "AgentTransaction" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"walletAddress" varchar(128) NOT NULL,
	"operationType" varchar(128) NOT NULL,
	"amount" varchar(64) NOT NULL,
	"signature" text NOT NULL,
	"metadata" json,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AgentWallet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"walletAddress" varchar(128) NOT NULL,
	"privateKeyEncrypted" text,
	"chain" varchar(32) DEFAULT 'evm' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "GuestSession" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fingerprint" varchar(128) NOT NULL,
	"userId" uuid NOT NULL,
	"dailyMessageRemaining" integer DEFAULT 5 NOT NULL,
	"lastResetAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "GuestSession_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
ALTER TABLE "RelaySwapTracking" DROP CONSTRAINT "RelaySwapTracking_swapRequestId_unique";--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "isTemporary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "expiresAt" timestamp;--> statement-breakpoint
ALTER TABLE "AgentDelegation" ADD CONSTRAINT "AgentDelegation_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AgentTransaction" ADD CONSTRAINT "AgentTransaction_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AgentWallet" ADD CONSTRAINT "AgentWallet_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "GuestSession" ADD CONSTRAINT "GuestSession_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;