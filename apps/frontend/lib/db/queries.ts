import "server-only";

import { genSaltSync, hashSync } from "bcrypt-ts";
import { and, asc, desc, eq, gt, gte, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

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
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Save OTP to database with 10-minute expiry
export async function saveOTP(email: string, otp: string): Promise<void> {
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
  
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

    const userData: any = {
      id,
      email,
      name: name,
      image: image,
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

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
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
      .where(eq(user.id, userId));
  } catch (error) {
    console.error("Failed to update user email in database");
    throw error;
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
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));

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
      .orderBy(desc(chat.createdAt));
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
      .orderBy(desc(chat.createdAt));
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
      .set({ isArchived: false })
      .where(eq(chat.id, id));
  } catch (error) {
    console.error("Failed to restore chat in database");
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error("Failed to get chat by id from database");
    throw error;
  }
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error("Failed to save messages in database", error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
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
    return await db.update(chat).set({ title }).where(eq(chat.id, chatId));
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
    await db.update(user).set({
      dailyMessageRemaining: sql`CASE
        WHEN tier = 'free' THEN ${process.env.FREE_USER_MESSAGE_LIMIT}
        WHEN tier = 'pro' THEN ${process.env.PRO_USER_MESSAGE_LIMIT}
        WHEN tier = 'ultimate' THEN ${process.env.ULTIMATE_USER_MESSAGE_LIMIT}
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
    await db
      .update(user)
      .set({
        dailyMessageRemaining: sql`CASE
          WHEN tier = 'free' THEN ${process.env.FREE_USER_MESSAGE_LIMIT}
          WHEN tier = 'pro' THEN ${process.env.PRO_USER_MESSAGE_LIMIT}
          WHEN tier = 'ultimate' THEN ${process.env.ULTIMATE_USER_MESSAGE_LIMIT}
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

      // 6. Delete other associated data
      await tx.delete(email_change_requests).where(eq(email_change_requests.userId, userId));
      await tx.delete(password_reset_tokens).where(eq(password_reset_tokens.email, email));
      await tx.delete(otp_tokens).where(eq(otp_tokens.email, email));

      // 7. Finally, delete the user
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