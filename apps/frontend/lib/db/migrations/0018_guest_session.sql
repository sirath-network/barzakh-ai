CREATE TABLE IF NOT EXISTS "GuestSession" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "fingerprint" varchar(128) NOT NULL UNIQUE,
  "userId" uuid NOT NULL REFERENCES "User"("id"),
  "dailyMessageRemaining" integer DEFAULT 5 NOT NULL,
  "lastResetAt" timestamp DEFAULT now() NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
