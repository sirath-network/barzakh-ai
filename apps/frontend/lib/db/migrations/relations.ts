import { relations } from "drizzle-orm/relations";
import { chat, message, user, suggestion, document, customer, billingAddress, emailChangeRequests, subscription, x402Transaction, vote } from "./schema";

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

export const suggestionRelations = relations(suggestion, ({one}) => ({
	user: one(user, {
		fields: [suggestion.userId],
		references: [user.id]
	}),
	document: one(document, {
		fields: [suggestion.documentId],
		references: [document.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	suggestions: many(suggestion),
	chats: many(chat),
	customers: many(customer),
	emailChangeRequests: many(emailChangeRequests),
	x402Transactions: many(x402Transaction),
	documents: many(document),
}));

export const documentRelations = relations(document, ({one, many}) => ({
	suggestions: many(suggestion),
	user: one(user, {
		fields: [document.userId],
		references: [user.id]
	}),
}));

export const customerRelations = relations(customer, ({one, many}) => ({
	user: one(user, {
		fields: [customer.userId],
		references: [user.id]
	}),
	billingAddresses: many(billingAddress),
	subscriptions: many(subscription),
}));

export const billingAddressRelations = relations(billingAddress, ({one}) => ({
	customer: one(customer, {
		fields: [billingAddress.customerId],
		references: [customer.id]
	}),
}));

export const emailChangeRequestsRelations = relations(emailChangeRequests, ({one}) => ({
	user: one(user, {
		fields: [emailChangeRequests.userId],
		references: [user.id]
	}),
}));

export const subscriptionRelations = relations(subscription, ({one}) => ({
	customer: one(customer, {
		fields: [subscription.customerId],
		references: [customer.id]
	}),
}));

export const x402TransactionRelations = relations(x402Transaction, ({one}) => ({
	user: one(user, {
		fields: [x402Transaction.userId],
		references: [user.id]
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