import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db/db";
import { subscription as subscriptionTable, customer as customerTable, user as userTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import Stripe from "stripe";

type Tier = "free" | "pro" | "ultimate";

const buildPriceIdSet = (...values: Array<string | undefined>) => {
    const ids = new Set<string>();
    values.forEach((value) => {
        if (!value) return;
        value
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean)
            .forEach((entry) => ids.add(entry));
    });
    return ids;
};

const PRO_PRICE_IDS = buildPriceIdSet(
    process.env.STRIPE_PRO_PRICE_IDS,
    process.env.STRIPE_PRO_PRICE_ID,
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    process.env.STRIPE_PRO_QUARTERLY_PRICE_ID,
    process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID
);

const ULTIMATE_PRICE_IDS = buildPriceIdSet(
    process.env.STRIPE_ULTIMATE_PRICE_IDS,
    process.env.STRIPE_ULTIMATE_PRICE_ID,
    process.env.STRIPE_ULTIMATE_MONTHLY_PRICE_ID,
    process.env.STRIPE_ULTIMATE_QUARTERLY_PRICE_ID,
    process.env.STRIPE_ULTIMATE_YEARLY_PRICE_ID
);

function resolveTierFromSubscription(subscription: Stripe.Subscription): Tier {
    if (!(subscription.status === "active" || subscription.status === "trialing")) {
        return "free";
    }

    const metadataTier = (subscription.metadata?.tier ?? subscription.metadata?.planId)?.toLowerCase();
    if (metadataTier === "ultimate" || metadataTier === "pro") {
        return metadataTier;
    }

    const priceId = subscription.items.data[0]?.price.id;
    if (priceId && ULTIMATE_PRICE_IDS.has(priceId)) {
        return "ultimate";
    }
    if (priceId && PRO_PRICE_IDS.has(priceId)) {
        return "pro";
    }

    return "pro";
}

function getDailyMessageLimitForTier(tier: Tier): number | undefined {
    const envValue =
        tier === "free"
            ? process.env.FREE_USER_MESSAGE_LIMIT
            : tier === "pro"
            ? process.env.PRO_USER_MESSAGE_LIMIT
            : process.env.ULTIMATE_USER_MESSAGE_LIMIT;

    if (!envValue) {
        return undefined;
    }

    const parsed = Number.parseInt(envValue, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * ✅ MODIFIED FUNCTION
 * A helper function to handle the business logic of updating subscription data in our database.
 * This is called from multiple webhook events to ensure logic is consistent.
 * @param subscriptionId - The ID of the Stripe subscription object.
 * @param customerId - The ID of the Stripe customer object.
 * @param invoice - Optional Stripe invoice object, useful for getting period end dates immediately.
 */
async function manageSubscriptionStatusChange(subscriptionId: string, customerId: string, invoice?: Stripe.Invoice) {
    // 1. Find our internal customer record.
    const customer = await db.select().from(customerTable).where(eq(customerTable.stripeCustomerId, customerId));
    if (customer.length === 0) {
        console.error(`Webhook Error: Could not find customer in DB with Stripe customer ID: ${customerId}`);
        return;
    }
    const userId = customer[0].userId;

    // 2. Retrieve the latest subscription details from Stripe to get the real status.
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    const tier = resolveTierFromSubscription(subscription);
    const dailyLimit = getDailyMessageLimitForTier(tier);

    const updatePayload: { tier: Tier; dailyMessageRemaining?: number } = { tier };
    if (typeof dailyLimit === "number") {
        updatePayload.dailyMessageRemaining = dailyLimit;
    }

    await db.update(userTable)
        .set(updatePayload)
        .where(eq(userTable.id, userId));
    console.log(`✅ User tier set to "${tier}" for userId: ${userId}`);

    // If the tier is now 'free', we don't need to sync subscription dates.
    // The 'customer.subscription.deleted' handler will remove the subscription record.
    if (tier === 'free') {
        return;
    }

    // 4. Determine the period end date for active subscriptions.
    let periodEndTimestamp: number | null | undefined = invoice?.period_end;
    if (typeof periodEndTimestamp !== 'number') {
        periodEndTimestamp = (subscription as any).current_period_end ?? subscription.trial_end;
    }

    if (typeof periodEndTimestamp !== 'number') {
        console.warn(`⚠️ Webhook Warning: Subscription ${subscription.id} is missing a valid period end date. User access was granted, but subscription details could not be synced.`);
        return;
    }
    const periodEndDate = new Date(periodEndTimestamp * 1000);

    // 5. Create or update the subscription record in our database.
    const primaryItem = subscription.items.data[0];
    if (!primaryItem) {
        console.error(`Webhook Error: Subscription ${subscription.id} does not have any line items.`);
        return;
    }

    if (!primaryItem.price?.id) {
        console.error(`Webhook Error: Line item for subscription ${subscription.id} is missing a price ID.`);
        return;
    }

    const subscriptionData = {
        customerId: customer[0].id,
        stripeSubscriptionId: subscription.id,
        stripePriceId: primaryItem.price.id,
        stripeCurrentPeriodEnd: periodEndDate,
    };

    const existingSubscription = await db.select().from(subscriptionTable).where(eq(subscriptionTable.stripeSubscriptionId, subscription.id));

    if (existingSubscription.length === 0) {
        await db.insert(subscriptionTable).values(subscriptionData);
        console.log(`✅ New subscription record created for customer: ${customer[0].id}`);
    } else {
        await db.update(subscriptionTable)
            .set({
                stripePriceId: subscriptionData.stripePriceId,
                stripeCurrentPeriodEnd: subscriptionData.stripeCurrentPeriodEnd,
            })
            .where(eq(subscriptionTable.stripeSubscriptionId, subscription.id));
        console.log(`✅ Existing subscription record updated for customer: ${customer[0].id}`);
    }
}


// --- Main Webhook Handler (No changes needed below this line) ---

export async function POST(req: Request) {
    const body = await req.text();
    const sig = req.headers.get("Stripe-Signature") as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: Stripe.Event;

    // 1. Verify the webhook signature for security
    try {
        if (!sig || !webhookSecret) {
            console.error('❌ Webhook Error: Missing signature or webhook secret.');
            throw new Error('Missing webhook signature or secret');
        }
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
        console.error(`❌ Webhook signature verification failed: ${err.message}`);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log(`✅ Webhook received and verified: ${event.type}`);

    // 2. Handle the specific event type
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.customer) {
                    const customerId = session.customer as string;
                    const subscription = await stripe.subscriptions.list({ customer: customerId, limit: 1 });
                    if (subscription.data.length > 0) {
                        const invoice = await stripe.invoices.retrieve(session.invoice as string);
                        await manageSubscriptionStatusChange(subscription.data[0].id, customerId, invoice);
                    } else {
                        console.error(`Webhook Error: No subscription found for customer ID: ${customerId}`);
                    }
                } else {
                    console.error(`Webhook Error: checkout.session.completed event is missing customer ID.`);
                }
                break;
            }

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.pending_update_applied': {
                const subscription = event.data.object as Stripe.Subscription;
                if (subscription.customer) {
                    await manageSubscriptionStatusChange(subscription.id, subscription.customer as string);
                } else {
                    console.error(`Webhook Error: ${event.type} event is missing customer ID.`);
                }
                break;
            }

            case 'invoice.paid':
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                if ((invoice as any).subscription && invoice.customer) {
                    await manageSubscriptionStatusChange((invoice as any).subscription as string, invoice.customer as string, invoice);
                }
                break;
            }
            
            case 'customer.subscription.trial_will_end': {
                const subscription = event.data.object as Stripe.Subscription;
                console.log(`💡 Subscription trial is ending soon for customer: ${subscription.customer}`);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const localSub = await db.select().from(subscriptionTable).where(eq(subscriptionTable.stripeSubscriptionId, subscription.id));

                if (localSub.length > 0) {
                    const customer = await db.select().from(customerTable).where(eq(customerTable.id, localSub[0].customerId));
                    if (customer.length > 0) {
                        const freeLimit = getDailyMessageLimitForTier("free");
                        const resetPayload: { tier: Tier; dailyMessageRemaining?: number } = { tier: "free" };
                        if (typeof freeLimit === "number") {
                            resetPayload.dailyMessageRemaining = freeLimit;
                        }

                        await db.update(userTable).set(resetPayload).where(eq(userTable.id, customer[0].userId));
                        console.log(`✅ User tier set to "free" for userId: ${customer[0].userId}`);
                    }
                    await db.delete(subscriptionTable).where(eq(subscriptionTable.id, localSub[0].id));
                    console.log(`✅ Deleted subscription from database for subscriptionId: ${subscription.id}`);
                }
                break;
            }
            
            default:
                console.log(`💡 Unhandled event type: ${event.type}`);
        }
    } catch (error) {
        console.error('Webhook handler failed:', error);
        return new NextResponse("Webhook handler failed", { status: 500 });
    }

    // 3. Acknowledge receipt of the event
    return new NextResponse(null, { status: 200 });
}