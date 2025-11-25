import { pgTable, unique, uuid, varchar, integer, text, boolean, foreignKey, timestamp, json, primaryKey } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"




export const user = pgTable("User", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 64 }),
	password: varchar({ length: 64 }),
	walletAddress: varchar({ length: 64 }),
	tier: varchar({ length: 64 }).default('free').notNull(),
	messageCount: integer().default(0).notNull(),
	dailyMessageRemaining: integer().default(50).notNull(),
	name: text(),
	username: text(),
	image: text(),
	twoFactorSecret: text(),
	twoFactorEnabled: boolean().default(false).notNull(),
	backupCodes: text(),
	tokenVersion: integer().default(0).notNull(),
	x402CancelAtPeriodEnd: boolean().default(false).notNull(),
},
(table) => {
	return {
		userEmailUnique: unique("User_email_unique").on(table.email),
		userUsernameUnique: unique("User_username_unique").on(table.username),
	}
});

export const emailChangeRequests = pgTable("EmailChangeRequests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid().notNull(),
	newEmail: varchar({ length: 64 }).notNull(),
	code: varchar().notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
},
(table) => {
	return {
		emailChangeRequestsUserIdUserIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "EmailChangeRequests_userId_User_id_fk"
		}),
	}
});

export const message = pgTable("Message", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	chatId: uuid().notNull(),
	role: varchar().notNull(),
	content: json().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
},
(table) => {
	return {
		messageChatIdChatIdFk: foreignKey({
			columns: [table.chatId],
			foreignColumns: [chat.id],
			name: "Message_chatId_Chat_id_fk"
		}),
	}
});

export const subscription = pgTable("Subscription", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	customerId: uuid().notNull(),
	stripeSubscriptionId: varchar({ length: 255 }).notNull(),
	stripePriceId: varchar({ length: 255 }).notNull(),
	stripeCurrentPeriodEnd: timestamp({ mode: 'string' }).notNull(),
},
(table) => {
	return {
		subscriptionCustomerIdCustomerIdFk: foreignKey({
			columns: [table.customerId],
			foreignColumns: [customer.id],
			name: "Subscription_customerId_Customer_id_fk"
		}),
		subscriptionStripeSubscriptionIdUnique: unique("Subscription_stripeSubscriptionId_unique").on(table.stripeSubscriptionId),
	}
});

export const otpToken = pgTable("OTPToken", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 64 }).notNull(),
	otp: varchar().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	expiry: timestamp({ mode: 'string' }).notNull(),
},
(table) => {
	return {
		otpTokenEmailUnique: unique("OTPToken_email_unique").on(table.email),
	}
});

export const passwordResetToken = pgTable("PasswordResetToken", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 64 }).notNull(),
	token: varchar().notNull(),
	expiry: timestamp({ mode: 'string' }).notNull(),
},
(table) => {
	return {
		passwordResetTokenEmailUnique: unique("PasswordResetToken_email_unique").on(table.email),
	}
});

export const suggestion = pgTable("Suggestion", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	documentId: uuid().notNull(),
	documentCreatedAt: timestamp({ mode: 'string' }).notNull(),
	originalText: text().notNull(),
	suggestedText: text().notNull(),
	description: text(),
	isResolved: boolean().default(false).notNull(),
	userId: uuid().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
},
(table) => {
	return {
		suggestionDocumentIdDocumentCreatedAtDocumentIdCreatedAtF: foreignKey({
			columns: [table.documentId, table.documentCreatedAt],
			foreignColumns: [document.id, document.createdAt],
			name: "Suggestion_documentId_documentCreatedAt_Document_id_createdAt_f"
		}),
		suggestionUserIdUserIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Suggestion_userId_User_id_fk"
		}),
	}
});

export const x402Transaction = pgTable("X402Transaction", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid().notNull(),
	transactionHash: varchar({ length: 66 }).notNull(),
	chainId: integer().notNull(),
	amount: varchar({ length: 64 }).notNull(),
	tokenAddress: varchar({ length: 42 }),
	planId: varchar({ length: 64 }).notNull(),
	status: varchar({ length: 32 }).default('pending').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	billingCycle: varchar({ length: 32 }).default('monthly').notNull(),
	senderAddress: varchar({ length: 42 }),
},
(table) => {
	return {
		x402TransactionUserIdUserIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "X402Transaction_userId_User_id_fk"
		}),
		x402TransactionTransactionHashUnique: unique("X402Transaction_transactionHash_unique").on(table.transactionHash),
	}
});

export const chat = pgTable("Chat", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
	userId: uuid().notNull(),
	title: text().notNull(),
	visibility: varchar().default('private').notNull(),
	isArchived: boolean().default(false).notNull(),
},
(table) => {
	return {
		chatUserIdUserIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Chat_userId_User_id_fk"
		}),
	}
});

export const customer = pgTable("Customer", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid().notNull(),
	stripeCustomerId: varchar({ length: 255 }).notNull(),
},
(table) => {
	return {
		customerUserIdUserIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Customer_userId_User_id_fk"
		}),
		customerStripeCustomerIdUnique: unique("Customer_stripeCustomerId_unique").on(table.stripeCustomerId),
	}
});

export const billingAddress = pgTable("BillingAddress", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	customerId: uuid().notNull(),
	street: varchar({ length: 255 }),
	city: varchar({ length: 255 }),
	state: varchar({ length: 255 }),
	zip: varchar({ length: 255 }),
	country: varchar({ length: 255 }),
},
(table) => {
	return {
		billingAddressCustomerIdCustomerIdFk: foreignKey({
			columns: [table.customerId],
			foreignColumns: [customer.id],
			name: "BillingAddress_customerId_Customer_id_fk"
		}),
	}
});

export const vote = pgTable("Vote", {
	chatId: uuid().notNull(),
	messageId: uuid().notNull(),
	isUpvoted: boolean().notNull(),
},
(table) => {
	return {
		voteChatIdChatIdFk: foreignKey({
			columns: [table.chatId],
			foreignColumns: [chat.id],
			name: "Vote_chatId_Chat_id_fk"
		}),
		voteMessageIdMessageIdFk: foreignKey({
			columns: [table.messageId],
			foreignColumns: [message.id],
			name: "Vote_messageId_Message_id_fk"
		}),
		voteChatIdMessageIdPk: primaryKey({ columns: [table.chatId, table.messageId], name: "Vote_chatId_messageId_pk"}),
	}
});

export const document = pgTable("Document", {
	id: uuid().defaultRandom().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
	title: text().notNull(),
	content: text(),
	userId: uuid().notNull(),
	text: varchar().default('text').notNull(),
},
(table) => {
	return {
		documentUserIdUserIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Document_userId_User_id_fk"
		}),
		documentIdCreatedAtPk: primaryKey({ columns: [table.id, table.createdAt], name: "Document_id_createdAt_pk"}),
	}
});