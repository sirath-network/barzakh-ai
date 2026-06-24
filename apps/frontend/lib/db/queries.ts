import "server-only";
import { cache } from 'react';

import { genSaltSync, hashSync } from "bcrypt-ts";
import { and, asc, desc, eq, gt, gte, inArray, sql } from "drizzle-orm";
import { isReservedUsername } from "@/lib/reserved-usernames";

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  type Message,
  message,
  vote,
  password_reset_tokens,
  otp_tokens,
  email_change_requests,
  customer,
  subscription,
  billingAddress,
  x402_transactions,
  guest_session,
  type GuestSession,
} from "./schema";

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// Import the shared database instance instead of creating a new client
import { db } from './db';

// Singleton pattern to ensure initialization only happens once
let isInitialized = false;

// Test connection on startup (only in development)
if (process.env.NODE_ENV === 'development' && !isInitialized) {
  isInitialized = true;
  (async () => {
    try {
      await db.execute(sql`SELECT 1`);
      // Connection successful - monitoring removed for performance
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      // Don't exit in production, just log the error
      if (process.env.NODE_ENV === 'development') {
        process.exit(1);
      }
    }
  })();
}

export function generateOTP(): string {
  // SECURITY: Use cryptographically secure random number generation
  const randomBytes = require('node:crypto').randomBytes(4);
  const randomNumber = randomBytes.readUInt32BE(0);
  return (100000 + (randomNumber % 900000)).toString();
}

// Save OTP to database with 5-minute expiry
export async function saveOTP(email: string, otp: string): Promise<void> {
  const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

  try {
    await db
      .insert(otp_tokens)
      .values({ email, otp, expiry })
      .onConflictDoUpdate({
        target: otp_tokens.email,
        set: { otp, expiry },
      });
  } catch (error) {
    console.error(`❌ Error saving OTP for ${email}:`, error);
    throw new Error("Failed to save verification code");
  }
}

// Get OTP from database
export async function getOTP(email: string) {
  try {
    const [otpToken] = await db
      .select()
      .from(otp_tokens)
      .where(eq(otp_tokens.email, email));

    return otpToken;
  } catch (error) {
    console.error("Failed to get OTP from database");
    throw error;
  }
}

// Delete OTP from database
export async function deleteOTP(email: string) {
  try {
    return await db
      .delete(otp_tokens)
      .where(eq(otp_tokens.email, email));
  } catch (error) {
    console.error("Failed to delete OTP from database");
    throw error;
  }
}

export async function getUser(email: string): Promise<Array<User>> {
  try {
    // Optimize query with limit(1) since we only need one result
    return await db.select().from(user).where(eq(user.email, email)).limit(1);
  } catch (error) {
    console.error("Failed to get user from database:", error);
    throw error;
  }
}

// Look up user by username
export async function getUserByUsername(username: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.username, username));
  } catch (error) {
    console.error("Failed to get user by username from database");
    throw error;
  }
}

export async function getUserByWalletAddress(walletAddress: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.walletAddress, walletAddress)).limit(1);
  } catch (error) {
    console.error("Failed to get user by wallet address from database:", error);
    throw error;
  }
}

export async function createUserWithWallet(
  id: string,
  walletAddress: string,
  name?: string | null,
  image?: string | null
) {
  try {
    // Generate random username and name if not provided
    // Use a random 8-digit number to ensure uniqueness and compliance with username rules
    // Rules: 3-20 chars, start with letter, lowercase letters and numbers only, no special chars
    const randomNum = Math.floor(10000000 + Math.random() * 90000000).toString();

    const finalName = name || `User ${randomNum}`;
    const finalUsername = `user${randomNum}`;

    const userData: any = {
      id,
      walletAddress,
      name: finalName,
      username: finalUsername,
      image: image,
    };

    const result = await db.insert(user).values(userData).returning();
    return result;
  } catch (error) {
    console.error("Failed to create user with wallet:", {
      error,
      walletAddress,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}
export async function getUserById(id: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.id, id));
  } catch (error) {
    console.error("Failed to get user from database");
    throw error;
  }
}

export async function createUser(
  id: string,
  email: string,
  password: string | null,
  name?: string | null,
  image?: string | null
) {
  try {
    // Generate a valid username from name or email
    const generatedUsername = await generateUsernameFromName(name, email);

    const userData: any = {
      id,
      email,
      name: name,
      image: image,
      username: generatedUsername,
    };

    // Only hash and add password if it's provided (not null)
    if (password !== null) {
      const salt = genSaltSync(10);
      const hash = hashSync(password, salt);
      userData.password = hash;
    }

    const result = await db.insert(user).values(userData).returning();

    return result;
  } catch (error) {
    console.error("Failed to create user:", {
      error,
      email,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Generate a valid username from name or email.
 * Rules:
 * - 3-20 characters
 * - Must start with a letter
 * - Lowercase letters and numbers only
 * - No spaces or special characters
 * - Cannot be a reserved username (unless @barzakh.tech email)
 * - Skip reserved words in names (e.g., "Admin Smith" → "smith" not "adminsmith")
 */
async function generateUsernameFromName(name?: string | null, email?: string | null): Promise<string> {
  let baseUsername = "";

  // Try to use name first, skip reserved words
  if (name?.trim()) {
    // Split name into parts and filter out reserved words
    const nameParts = name.toLowerCase().split(/\s+/);
    const validParts: string[] = [];

    for (const part of nameParts) {
      const cleanPart = part.replace(/[^a-z0-9]/g, '').trim();
      if (cleanPart && !isReservedUsername(cleanPart, email)) {
        validParts.push(cleanPart);
      }
    }

    // Use non-reserved parts to build username
    if (validParts.length > 0) {
      baseUsername = validParts.join('');
    }
  }

  // If no valid parts from name, try email prefix
  if (!baseUsername && email) {
    const emailPrefix = email.split('@')[0];
    const cleanEmail = emailPrefix.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

    // Check if email prefix is reserved
    if (cleanEmail && !isReservedUsername(cleanEmail, email)) {
      baseUsername = cleanEmail;
    }
  }

  // Ensure it starts with a letter
  if (!baseUsername || !/^[a-z]/.test(baseUsername)) {
    // Use 'user' prefix if empty or doesn't start with a letter
    baseUsername = `user${baseUsername}`;
  }

  // Ensure minimum length of 3
  if (baseUsername.length < 3) {
    baseUsername = `${baseUsername}user`;
  }

  // Truncate to max 16 chars to leave room for random suffix
  if (baseUsername.length > 16) {
    baseUsername = baseUsername.slice(0, 16);
  }

  // Final check - if base username is still reserved (edge case), use random fallback
  if (isReservedUsername(baseUsername, email)) {
    const fallbackSuffix = Math.floor(10000000 + Math.random() * 90000000).toString();
    baseUsername = `user${fallbackSuffix}`;
  }

  // Try the base username first, then add random suffix if taken
  let username = baseUsername;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    // Check if username is already taken
    const existing = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, username))
      .limit(1);

    if (existing.length === 0) {
      // Username is available
      return username;
    }

    // Add random suffix and try again
    const suffix = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digit random
    username = baseUsername.slice(0, 15) + suffix; // Ensure total <= 20 chars
    attempts++;
  }

  // Fallback: use 'user' + random UUID portion (this is always safe)
  const fallbackSuffix = Math.floor(10000000 + Math.random() * 90000000).toString();
  return `user${fallbackSuffix}`;
}

export async function saveChat({
  id,
  userId,
  title,
  forkedFromChatId,
}: {
  id: string;
  userId: string;
  title: string;
  forkedFromChatId?: string;
}) {
  try {
    const now = new Date();
    return await db.insert(chat).values({
      id,
      createdAt: now,
      updatedAt: now,
      userId,
      title,
      forkedFromChatId,
    });
  } catch (error) {
    console.error("Failed to save chat in database");
    throw error;
  }
}

export async function updateUserPassword(email: string, newPassword: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(newPassword, salt);

  try {
    return await db
      .update(user)
      .set({
        password: hash,
        tokenVersion: sql`${user.tokenVersion} + 1`
      })
      .where(eq(user.email, email));
  } catch (error) {
    console.error("Failed to update user password in database");
    throw error;
  }
}

export async function incrementUserTokenVersion(userId: string) {
  try {
    await db
      .update(user)
      .set({ tokenVersion: sql`${user.tokenVersion} + 1` })
      .where(eq(user.id, userId));
  } catch (error) {
    console.error("Failed to increment user token version:", error);
    throw error;
  }
}

export async function saveEmailChangeRequest({
  userId,
  newEmail,
  code,
  expiresAt,
}: {
  userId: string;
  newEmail: string;
  code: string;
  expiresAt: Date;
}) {
  try {
    // Delete old user request if exists
    await db.delete(email_change_requests).where(eq(email_change_requests.userId, userId));

    // Save new request
    await db.insert(email_change_requests).values({
      userId,
      newEmail,
      code,
      expiresAt
    });
  } catch (error) {
    console.error("Failed to save email change request in database:", error);
    throw error;
  }
}

// --- NEW FUNCTION TO UPDATE EMAIL ---
export async function updateUserEmail(userId: string, newEmail: string) {
  try {
    return await db
      .update(user)
      .set({
        email: newEmail,
        tokenVersion: sql`${user.tokenVersion} + 1`
      })
      .where(eq(user.id, userId))
      .returning();
  } catch (error) {
    console.error("Failed to update user email in database");
    throw error;
  }
}

export async function updateUserWalletAddress(userId: string, walletAddress: string) {
  try {
    const [updatedUser] = await db
      .update(user)
      .set({ walletAddress })
      .where(eq(user.id, userId))
      .returning();
    return updatedUser;
  } catch (error) {
    console.error("Failed to update user wallet address:", error);
    throw new Error("Failed to update wallet address");
  }
}

export async function removeUserWalletAddress(userId: string) {
  try {
    const [updatedUser] = await db
      .update(user)
      .set({ walletAddress: null })
      .where(eq(user.id, userId))
      .returning();
    return updatedUser;
  } catch (error) {
    console.error("Failed to remove user wallet address:", error);
    throw new Error("Failed to remove wallet address");
  }
}


export async function savePasswordResetToken(email: string, token: string) {
  try {
    await db
      .insert(password_reset_tokens)
      .values({ email, token, expiry: new Date(Date.now() + 3600000) })
      .onConflictDoUpdate({
        target: password_reset_tokens.email,
        set: { token, expiry: new Date(Date.now() + 3600000) },
      });
  } catch (error) {
    console.error("Failed to save password reset token in database:", error);
    throw error;
  }
}

export async function getPasswordResetToken(token: string) {
  try {
    const [resetToken] = await db
      .select()
      .from(password_reset_tokens)
      .where(eq(password_reset_tokens.token, token));

    return resetToken;
  } catch (error) {
    console.error("Failed to get password reset token from database");
    throw error;
  }
}

export async function getPasswordResetTokenUsingEmail(email: string) {
  try {
    const [token] = await db
      .select()
      .from(password_reset_tokens)
      .where(eq(password_reset_tokens.email, email));
    return token;
  } catch (error) {
    console.error("Failed to get password reset token from database");
    throw error;
  }
}

export async function deletePasswordResetToken(token: string) {
  try {
    return await db
      .delete(password_reset_tokens)
      .where(eq(password_reset_tokens.token, token));
  } catch (error) {
    console.error("Failed to delete password reset token from database");
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    // Run vote and message deletions in parallel for faster execution
    await Promise.all([
      db.delete(vote).where(eq(vote.chatId, id)),
      db.delete(message).where(eq(message.chatId, id)),
    ]);

    // Delete the chat itself last (after related records are removed)
    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error("Failed to delete chat by id from database");
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      .where(and(eq(chat.userId, id), eq(chat.isArchived, false)))
      .orderBy(desc(chat.updatedAt));
  } catch (error) {
    console.error("Failed to get chats by user from database");
    throw error;
  }
}

export async function getArchivedChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      .where(and(eq(chat.userId, id), eq(chat.isArchived, true)))
      .orderBy(desc(chat.updatedAt));
  } catch (error) {
    console.error("Failed to get archived chats by user from database");
    throw error;
  }
}

export async function archiveChat({ id }: { id: string }) {
  try {
    return await db
      .update(chat)
      .set({ isArchived: true })
      .where(eq(chat.id, id));
  } catch (error) {
    console.error("Failed to archive chat in database");
    throw error;
  }
}

export async function restoreChat({ id }: { id: string }) {
  try {
    return await db
      .update(chat)
      .set({ isArchived: false, updatedAt: new Date() })
      .where(eq(chat.id, id));
  } catch (error) {
    console.error("Failed to unarchive conversation in database");
    throw error;
  }
}

export const getChatById = cache(async ({ id }: { id: string }) => {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error("Failed to get chat by id from database");
    throw error;
  }
});

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error("Failed to save messages in database", error);
    throw error;
  }
}

export async function updateChatUpdatedAt({ id }: { id: string }) {
  try {
    return await db
      .update(chat)
      .set({ updatedAt: new Date() })
      .where(eq(chat.id, id));
  } catch (error) {
    console.error("Failed to update chat updatedAt in database");
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    let allMessages: Array<Message> = [];
    let currentId: string | null = id;
    let depth = 0;
    const maxDepth = 5;
    const seenIds = new Set<string>();

    while (currentId && depth < maxDepth && !seenIds.has(currentId)) {
      seenIds.add(currentId);
      const chatId = currentId;

      const chatRows = await db
        .select({ forkedFromChatId: chat.forkedFromChatId })
        .from(chat)
        .where(eq(chat.id, chatId));

      const messages = await db
        .select()
        .from(message)
        .where(eq(message.chatId, chatId))
        .orderBy(asc(message.createdAt));

      const chatInfo = chatRows[0];

      // Prepend messages from the current level (ancestors come later in loop but should be first in list)
      // wait, loop goes: Leaf -> Parent -> Grandparent
      // We want: [GrandparentMsgs, ParentMsgs, LeafMsgs]
      // Iteration 1 (Leaf): allMessages = [LeafMsgs]
      // Iteration 2 (Parent): allMessages = [ParentMsgs, ...LeafMsgs]
      // Iteration 3 (Grandparent): allMessages = [GrandparentMsgs, ...ParentMsgs, ...LeafMsgs]
      allMessages = [...messages, ...allMessages];

      if (chatInfo?.forkedFromChatId) {
        currentId = chatInfo.forkedFromChatId;
      } else {
        currentId = null;
      }
      depth++;
    }

    return allMessages;
  } catch (error) {
    console.error("Failed to get messages by chat id from database", error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (error) {
    console.error("Failed to upvote message in database", error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error("Failed to get votes by chat id from database", error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: "text" | "code" | "image" | "sheet";
  content: string;
  userId: string;
}) {
  try {
    return await db.insert(document).values({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to save document in database");
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error("Failed to get document by id from database");
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error("Failed to get document by id from database");
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp)
        )
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error(
      "Failed to delete documents by id after timestamp from database"
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error("Failed to save suggestions in database");
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      "Failed to get suggestions by document version from database"
    );
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error("Failed to get message by id from database");
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds))
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds))
        );
    }
  } catch (error) {
    console.error(
      "Failed to delete messages by id after timestamp from database"
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error("Failed to update chat visibility in database");
    throw error;
  }
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  try {
    return await db.update(chat).set({ title, updatedAt: new Date() }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error("Failed to update chat title in database");
    throw error;
  }
}

export async function decrementRemainingMessageCount(userId: string) {
  try {
    await db
      .update(user)
      .set({
        dailyMessageRemaining: sql`${user.dailyMessageRemaining} - 1`,
        messageCount: sql`${user.messageCount} + 1`,
      })
      .where(eq(user.id, userId));
  } catch (error) {
    console.error("Failed to decrement remaining message count in database:", error);
    throw error;
  }
}
export async function resetRemainingMessageCountForEveryone() {
  try {
    // Reset message limits based on tier AND billing cycle
    await db.update(user).set({
      dailyMessageRemaining: sql`CASE
        WHEN tier = 'free' THEN ${process.env.FREE_USER_MESSAGE_LIMIT || 10}
        WHEN tier = 'pro' AND "billingCycle" = 'yearly' THEN ${process.env.PRO_YEARLY_USER_MESSAGE_LIMIT || 150}
        WHEN tier = 'pro' AND "billingCycle" = 'quarterly' THEN ${process.env.PRO_QUARTERLY_USER_MESSAGE_LIMIT || 100}
        WHEN tier = 'pro' THEN ${process.env.PRO_MONTHLY_USER_MESSAGE_LIMIT || 50}
        WHEN tier = 'ultimate' AND "billingCycle" = 'yearly' THEN ${process.env.ULTIMATE_YEARLY_USER_MESSAGE_LIMIT || 500}
        WHEN tier = 'ultimate' AND "billingCycle" = 'quarterly' THEN ${process.env.ULTIMATE_QUARTERLY_USER_MESSAGE_LIMIT || 350}
        WHEN tier = 'ultimate' THEN ${process.env.ULTIMATE_MONTHLY_USER_MESSAGE_LIMIT || 250}
        ELSE ${user.dailyMessageRemaining}
      END`,
    });
  } catch (error) {
    console.error("Failed to reset remaining message count for everyone in database:", error);
    throw error;
  }
}

export async function resetRemainingMessageCountForUser(userId: string) {
  try {
    // Reset message limit based on tier AND billing cycle
    await db
      .update(user)
      .set({
        dailyMessageRemaining: sql`CASE
          WHEN tier = 'free' THEN ${process.env.FREE_USER_MESSAGE_LIMIT || 10}
          WHEN tier = 'pro' AND "billingCycle" = 'yearly' THEN ${process.env.PRO_YEARLY_USER_MESSAGE_LIMIT || 150}
          WHEN tier = 'pro' AND "billingCycle" = 'quarterly' THEN ${process.env.PRO_QUARTERLY_USER_MESSAGE_LIMIT || 100}
          WHEN tier = 'pro' THEN ${process.env.PRO_MONTHLY_USER_MESSAGE_LIMIT || 50}
          WHEN tier = 'ultimate' AND "billingCycle" = 'yearly' THEN ${process.env.ULTIMATE_YEARLY_USER_MESSAGE_LIMIT || 500}
          WHEN tier = 'ultimate' AND "billingCycle" = 'quarterly' THEN ${process.env.ULTIMATE_QUARTERLY_USER_MESSAGE_LIMIT || 350}
          WHEN tier = 'ultimate' THEN ${process.env.ULTIMATE_MONTHLY_USER_MESSAGE_LIMIT || 250}
          ELSE ${user.dailyMessageRemaining}
        END`,
      })
      .where(eq(user.id, userId));
  } catch (error) {
    console.error("Failed to reset remaining message count for user in database:", error);
    throw error;
  }
}

export async function getMessageCount(userId: string): Promise<number> {
  try {
    const result = await db
      .select({ messageCount: user.messageCount })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    if (result.length === 0) {
      throw new Error("User not found");
    }
    return result[0].messageCount;
  } catch (error) {
    console.error("Failed to get message count from database:", error);
    throw error;
  }
}
export async function getUserTier(userId: string) {
  try {
    const result = await db
      .select({ tier: user.tier })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    if (result.length === 0) {
      throw new Error("User not found");
    }
    return result[0].tier;
  } catch (error) {
    console.error("Failed to get user tier from database:", error);
    throw error;
  }
}

export async function deleteUserAndData(userId: string, email: string) {
  try {
    await db.transaction(async (tx) => {
      // 1. Get all user's chats
      const userChats = await tx.select({ id: chat.id }).from(chat).where(eq(chat.userId, userId));
      const chatIds = userChats.map(c => c.id);

      // 2. Delete all votes, messages, and chats associated with the user
      if (chatIds.length > 0) {
        await tx.delete(vote).where(inArray(vote.chatId, chatIds));
        await tx.delete(message).where(inArray(message.chatId, chatIds));
        await tx.delete(chat).where(eq(chat.userId, userId));
      }

      // 3. Get all user's documents
      const userDocuments = await tx.select({ id: document.id }).from(document).where(eq(document.userId, userId));
      const documentIds = userDocuments.map(d => d.id);

      // 4. Delete all suggestions and documents associated with the user
      if (documentIds.length > 0) {
        await tx.delete(suggestion).where(inArray(suggestion.documentId, documentIds));
        await tx.delete(document).where(eq(document.userId, userId));
      }

      // 5. Delete customer data
      const userCustomer = await tx.select({ id: customer.id }).from(customer).where(eq(customer.userId, userId));
      if (userCustomer.length > 0) {
        const customerId = userCustomer[0].id;
        await tx.delete(billingAddress).where(eq(billingAddress.customerId, customerId));
        await tx.delete(subscription).where(eq(subscription.customerId, customerId));
        await tx.delete(customer).where(eq(customer.userId, userId));
      }

      // 6. Delete X402 transactions
      await tx.delete(x402_transactions).where(eq(x402_transactions.userId, userId));

      // 7. Delete other associated data
      await tx.delete(email_change_requests).where(eq(email_change_requests.userId, userId));

      if (email) {
        await tx.delete(password_reset_tokens).where(eq(password_reset_tokens.email, email));
        await tx.delete(otp_tokens).where(eq(otp_tokens.email, email));
      }

      // 8. Finally, delete the user
      await tx.delete(user).where(eq(user.id, userId));
    });
  } catch (error) {
    console.error(`Failed to delete user ${userId}:`, error);
    throw new Error("Failed to delete user account.");
  }
}

export async function updateUserProfile({
  email,
  name,
  username,
  image,
  password
}: {
  email: string;
  name?: string;
  username?: string;
  image?: string;
  password?: string;
}) {
  try {
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (username !== undefined) updateData.username = username;
    if (image !== undefined) updateData.image = image;
    if (password !== undefined) {
      const salt = genSaltSync(10);
      updateData.password = hashSync(password, salt);
    }

    const result = await db
      .update(user)
      .set(updateData)
      .where(eq(user.email, email))
      .returning();

    return result[0];
  } catch (error) {
    console.error("Failed to update user profile:", error);
    throw error;
  }
}

const GUEST_MESSAGE_LIMIT = 5;
const GUEST_RESET_HOURS = 24;

export async function getOrCreateGuestSession(fingerprint: string): Promise<{
  guestSession: GuestSession;
  guestUserId: string;
}> {
  try {
    const existing = await db
      .select()
      .from(guest_session)
      .where(eq(guest_session.fingerprint, fingerprint))
      .limit(1);

    if (existing.length > 0) {
      let session = existing[0];
      const now = new Date();
      const resetTime = new Date(session.lastResetAt);
      const hoursSinceReset = (now.getTime() - resetTime.getTime()) / (1000 * 60 * 60);

      if (hoursSinceReset >= GUEST_RESET_HOURS) {
        const [updated] = await db
          .update(guest_session)
          .set({
            dailyMessageRemaining: GUEST_MESSAGE_LIMIT,
            lastResetAt: now,
          })
          .where(eq(guest_session.id, session.id))
          .returning();
        session = updated;
      }

      return { guestSession: session, guestUserId: session.userId };
    }

    const guestUserId = crypto.randomUUID();
    const randomSuffix = Math.floor(10000000 + Math.random() * 90000000).toString();
    const guestUsername = `guest${randomSuffix}`;

    await db.insert(user).values({
      id: guestUserId,
      name: "Guest",
      username: guestUsername,
      tier: "guest",
    });

    const [newSession] = await db
      .insert(guest_session)
      .values({
        fingerprint,
        userId: guestUserId,
        dailyMessageRemaining: GUEST_MESSAGE_LIMIT,
      })
      .returning();

    return { guestSession: newSession, guestUserId };
  } catch (error) {
    console.error("Failed to get or create guest session:", error);
    throw error;
  }
}

export async function decrementGuestMessageCount(sessionId: string) {
  try {
    await db
      .update(guest_session)
      .set({
        dailyMessageRemaining: sql`${guest_session.dailyMessageRemaining} - 1`,
      })
      .where(eq(guest_session.id, sessionId));
  } catch (error) {
    console.error("Failed to decrement guest message count:", error);
    throw error;
  }
}

export async function resetGuestSessionLimits() {
  try {
    const cutoff = new Date(Date.now() - GUEST_RESET_HOURS * 60 * 60 * 1000);
    await db
      .update(guest_session)
      .set({
        dailyMessageRemaining: GUEST_MESSAGE_LIMIT,
        lastResetAt: new Date(),
      })
      .where(sql`${guest_session.lastResetAt} <= ${cutoff}`);
  } catch (error) {
    console.error("Failed to reset guest session limits:", error);
    throw error;
  }
}

export async function deleteExpiredChats() {
  try {
    const now = new Date();
    const result = await db
      .delete(chat)
      .where(
        and(
          eq(chat.isTemporary, true),
          sql`${chat.expiresAt} < ${now}`
        )
      );
    return result;
  } catch (error) {
    console.error("Failed to delete expired chats:", error);
    throw error;
  }
}

export async function updateUserWalrusMemoryBlobId(userId: string, blobId: string) {
  try {
    return await db.update(user).set({ walrusMemoryBlobId: blobId }).where(eq(user.id, userId));
  } catch (error) {
    console.error("Failed to update user walrusMemoryBlobId:", error);
    throw error;
  }
}

