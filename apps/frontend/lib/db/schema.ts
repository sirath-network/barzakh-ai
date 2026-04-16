import type { InferSelectModel } from "drizzle-orm";
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  integer,
  index,
  numeric,
} from "drizzle-orm/pg-core";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).unique(),
  walletAddress: varchar("walletAddress", { length: 128 }),
  password: varchar("password", { length: 255 }), // Increased from 64 to 255 for bcrypt hash safety
  // ✅ Tambahkan field yang hilang
  name: text("name"),
  username: text("username").unique(),
  image: text("image"),
  tier: varchar("tier", { length: 64 }).notNull().default("free"),
  billingCycle: varchar("billingCycle", { length: 32 }).notNull().default("monthly"),
  messageCount: integer("messageCount").notNull().default(0),
  dailyMessageRemaining: integer("dailyMessageRemaining")
    .notNull()
    .default(Number(process.env.FREE_USER_MESSAGE_LIMIT) || 10),
  // 2FA fields - twoFactorSecret is AES-256-GCM encrypted, backupCodes are bcrypt hashed
  twoFactorSecret: text("twoFactorSecret"), // Encrypted with AES-256-GCM
  twoFactorEnabled: boolean("twoFactorEnabled").notNull().default(false),
  backupCodes: text("backupCodes"), // JSON array of bcrypt hashed backup codes
  tokenVersion: integer("tokenVersion").notNull().default(0),
  x402CancelAtPeriodEnd: boolean("x402CancelAtPeriodEnd").notNull().default(false),
  x402PeriodEnd: timestamp("x402PeriodEnd"), // When x402 subscription expires
});

export const customer = pgTable("Customer", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId").notNull().references(() => user.id),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }).notNull().unique(),
});

export const billingAddress = pgTable("BillingAddress", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  customerId: uuid("customerId").notNull().references(() => customer.id),
  street: varchar("street", { length: 255 }),
  city: varchar("city", { length: 255 }),
  state: varchar("state", { length: 255 }),
  zip: varchar("zip", { length: 255 }),
  country: varchar("country", { length: 255 }),
});

export const subscription = pgTable("Subscription", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  customerId: uuid("customerId").notNull().references(() => customer.id),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }).notNull().unique(),
  stripePriceId: varchar("stripePriceId", { length: 255 }).notNull(),
  stripeCurrentPeriodEnd: timestamp("stripeCurrentPeriodEnd").notNull(),
});

export const otp_tokens = pgTable("OTPToken", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull().unique(),
  otp: varchar("otp").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  expiry: timestamp("expiry").notNull(),
});

export type OTPToken = InferSelectModel<typeof otp_tokens>;
export type User = InferSelectModel<typeof user>;

export const password_reset_tokens = pgTable("PasswordResetToken", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull().unique(),
  token: varchar("token").notNull(),
  expiry: timestamp("expiry").notNull(),
});

export type PasswordResetToken = InferSelectModel<typeof password_reset_tokens>;

export const email_change_requests = pgTable("EmailChangeRequests", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId").notNull().references(() => user.id),
  newEmail: varchar("newEmail", { length: 64 }).notNull(),
  code: varchar("code").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  isArchived: boolean("isArchived").notNull().default(false),
  forkedFromChatId: uuid("forkedFromChatId"),
  isTemporary: boolean("isTemporary").notNull().default(false),
  expiresAt: timestamp("expiresAt"),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable(
  "Message",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    role: varchar("role").notNull(),
    content: json("content").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    // Single column index for simple chatId lookups (e.g., DELETE operations)
    chatIdIdx: index("idx_message_chat_id").on(table.chatId),
    // Composite index for chatId + createdAt (optimizes ORDER BY queries)
    chatIdCreatedAtIdx: index("idx_message_chat_id_created_at").on(table.chatId, table.createdAt),
  })
);

export type Message = InferSelectModel<typeof message>;

export const vote = pgTable(
  "Vote",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    chatIdIdx: index("idx_vote_chat_id").on(table.chatId),
  })
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  }
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const x402_transactions = pgTable("X402Transaction", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId").notNull().references(() => user.id),
  transactionHash: varchar("transactionHash", { length: 128 }).notNull().unique(),
  chainId: integer("chainId").notNull(),
  amount: varchar("amount", { length: 64 }).notNull(),
  tokenAddress: varchar("tokenAddress", { length: 42 }),
  senderAddress: varchar("senderAddress", { length: 42 }), // Track who paid
  planId: varchar("planId", { length: 64 }).notNull(),
  billingCycle: varchar("billingCycle", { length: 32 }).notNull().default("monthly"),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type X402Transaction = InferSelectModel<typeof x402_transactions>;

// Relay Swap Tracking - prevents repeat swap execution
export const relay_swap_tracking = pgTable("RelaySwapTracking", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId").notNull().references(() => user.id),
  swapRequestId: text("swapRequestId").notNull().unique(), // Hash of swap params
  transactionHash: varchar("transactionHash", { length: 128 }), // Optional, for record keeping
  completedAt: timestamp("completedAt").notNull().defaultNow(),
});

export type RelaySwapTracking = InferSelectModel<typeof relay_swap_tracking>;

export const guest_session = pgTable("GuestSession", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  fingerprint: varchar("fingerprint", { length: 128 }).notNull().unique(),
  userId: uuid("userId").notNull().references(() => user.id),
  dailyMessageRemaining: integer("dailyMessageRemaining").notNull().default(5),
  lastResetAt: timestamp("lastResetAt").notNull().defaultNow(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type GuestSession = InferSelectModel<typeof guest_session>;

// --- Agent Wallet & Automation ---

export const agent_wallet = pgTable("AgentWallet", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId").notNull().references(() => user.id),
  walletAddress: varchar("walletAddress", { length: 128 }).notNull(),
  privateKeyEncrypted: text("privateKeyEncrypted"), // Encrypted with AES-256-GCM
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type AgentWallet = InferSelectModel<typeof agent_wallet>;

export const agent_delegation = pgTable("AgentDelegation", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId").notNull().references(() => user.id),
  walletId: varchar("walletId", { length: 255 }).notNull(),
  walletApiKey: text("walletApiKey").notNull(),
  keyShare: text("keyShare"),
  walletAddress: varchar("walletAddress", { length: 128 }).notNull(),
  chain: varchar("chain", { length: 64 }).notNull(),
  delegatedAt: timestamp("delegatedAt").notNull().defaultNow(),
  revokedAt: timestamp("revokedAt"),
});

export type AgentDelegation = InferSelectModel<typeof agent_delegation>;



export const agent_transaction = pgTable("AgentTransaction", {
  id: varchar("id", { length: 128 }).primaryKey().notNull(), // Uses standard generated string ID
  userId: uuid("userId").notNull().references(() => user.id),
  walletAddress: varchar("walletAddress", { length: 128 }).notNull(),
  operationType: varchar("operationType", { length: 128 }).notNull(),
  amount: varchar("amount", { length: 64 }).notNull(),
  signature: text("signature").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type AgentTransaction = InferSelectModel<typeof agent_transaction>;
