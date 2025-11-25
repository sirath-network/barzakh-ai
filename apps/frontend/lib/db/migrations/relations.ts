import { relations } from "drizzle-orm/relations";
import { user, emailChangeRequests, chat, message, customer, subscription, document, suggestion, x402Transaction, billingAddress, vote } from "./schema";

export const emailChangeRequestsRelations = relations(emailChangeRequests, ({one}) => ({
	user: one(user, {
		fields: [emailChangeRequests.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	emailChangeRequests: many(emailChangeRequests),
	suggestions: many(suggestion),
	x402Transactions: many(x402Transaction),
	chats: many(chat),
	customers: many(customer),
	documents: many(document),
}));

export const messageRelations = relations(message, ({one, many}) => ({
	chat: one(chat, {
		fields: [message.chatId],
		references: [chat.id]
	}),
	votes: many(vote),
}));

export const chatRelations = relations(chat, ({one, many}) => ({
	messages: many(message),
	user: one(user, {
		fields: [chat.userId],
		references: [user.id]
	}),
	votes: many(vote),
}));

export const subscriptionRelations = relations(subscription, ({one}) => ({
	customer: one(customer, {
		fields: [subscription.customerId],
		references: [customer.id]
	}),
}));

export const customerRelations = relations(customer, ({one, many}) => ({
	subscriptions: many(subscription),
	user: one(user, {
		fields: [customer.userId],
		references: [user.id]
	}),
	billingAddresses: many(billingAddress),
}));

export const suggestionRelations = relations(suggestion, ({one}) => ({
	document: one(document, {
		fields: [suggestion.documentId],
		references: [document.id]
	}),
	user: one(user, {
		fields: [suggestion.userId],
		references: [user.id]
	}),
}));

export const documentRelations = relations(document, ({one, many}) => ({
	suggestions: many(suggestion),
	user: one(user, {
		fields: [document.userId],
		references: [user.id]
	}),
}));

export const x402TransactionRelations = relations(x402Transaction, ({one}) => ({
	user: one(user, {
		fields: [x402Transaction.userId],
		references: [user.id]
	}),
}));

export const billingAddressRelations = relations(billingAddress, ({one}) => ({
	customer: one(customer, {
		fields: [billingAddress.customerId],
		references: [customer.id]
	}),
}));

export const voteRelations = relations(vote, ({one}) => ({
	chat: one(chat, {
		fields: [vote.chatId],
		references: [chat.id]
	}),
	message: one(message, {
		fields: [vote.messageId],
		references: [message.id]
	}),
}));