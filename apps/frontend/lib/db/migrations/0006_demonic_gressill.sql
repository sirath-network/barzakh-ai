CREATE TABLE IF NOT EXISTS "BillingAddress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customerId" uuid NOT NULL,
	"street" varchar(255),
	"city" varchar(255),
	"state" varchar(255),
	"zip" varchar(255),
	"country" varchar(255)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Customer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"stripeCustomerId" varchar(255) NOT NULL,
	CONSTRAINT "Customer_stripeCustomerId_unique" UNIQUE("stripeCustomerId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "EmailChangeRequests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"newEmail" varchar(64) NOT NULL,
	"code" varchar NOT NULL,
	"expiresAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "OTPToken" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(64) NOT NULL,
	"otp" varchar NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiry" timestamp NOT NULL,
	CONSTRAINT "OTPToken_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(64) NOT NULL,
	"token" varchar NOT NULL,
	"expiry" timestamp NOT NULL,
	CONSTRAINT "PasswordResetToken_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customerId" uuid NOT NULL,
	"stripeSubscriptionId" varchar(255) NOT NULL,
	"stripePriceId" varchar(255) NOT NULL,
	"stripeCurrentPeriodEnd" timestamp NOT NULL,
	CONSTRAINT "Subscription_stripeSubscriptionId_unique" UNIQUE("stripeSubscriptionId")
);
--> statement-breakpoint
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "isArchived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "walletAddress" varchar(64);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "tier" varchar(64) DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "messageCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "dailyMessageRemaining" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "tokenVersion" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "BillingAddress" ADD CONSTRAINT "BillingAddress_customerId_Customer_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "EmailChangeRequests" ADD CONSTRAINT "EmailChangeRequests_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_customerId_Customer_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "User_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "User_username_unique" UNIQUE("username");