import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db/db";
import { subscription as subscriptionTable, customer as customerTable, user as userTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import Stripe from "stripe";

/**
 * A helper function to handle the business logic of updating subscription data in our database.
 * This is called from multiple webhook events to ensure logic is consistent.
 * @param subscriptionId - The ID of the Stripe subscription object.
 * @param customerId - The ID of the Stripe customer object.
 */
async function manageSubscriptionStatusChange(subscriptionId: string, customerId: string) {
    // 1. Find our internal customer record.
    const customer = await db.select().from(customerTable).where(eq(customerTable.stripeCustomerId, customerId));
    if (customer.length === 0) {
        console.error(`Webhook Error: Could not find customer in DB with Stripe customer ID: ${customerId}`);
        return;
    }
    const userId = customer[0].userId;

    // 2. Immediately update the user's tier to "pro" to grant access.
    await db.update(userTable)
        .set({ tier: "pro" })
        .where(eq(userTable.id, userId));
    console.log(`✅ User tier set to "pro" for userId: ${userId}`);

    // 3. Retrieve subscription details from Stripe to sync our records.
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // 4. Check for a valid period end date.
    const periodEndTimestamp = subscription.current_period_end ?? subscription.trial_end;
    if (typeof periodEndTimestamp !== 'number') {
        // Log a warning and exit this function, but don't throw an error.
        // The user already has pro access. We just can't sync the subscription details yet.
        console.warn(`⚠️ Webhook Warning: Subscription ${subscription.id} is missing a valid period end date. User access has been granted, but the subscription record could not be synced.`);
        return;
    }
    const periodEndDate = new Date(periodEndTimestamp * 1000);

    // 5. Create or update the subscription record in our database (now that we know we have a date).
    const subscriptionData = {
        customerId: customer[0].id,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: periodEndDate,
    };

    // Using the original if/else since upsert is more complex with conditional fields.
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


// --- Main Webhook Handler ---

export async function POST(req: Request) {
    const body = await req.text();
    // Use req.headers.get() to safely read the Stripe signature from the incoming request
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
            // This event is sent when a user successfully completes the Stripe Checkout process.
            // It's the primary event for handling new subscriptions.
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.subscription && session.customer) {
                    await manageSubscriptionStatusChange(session.subscription as string, session.customer as string);
                } else {
                    console.error(`Webhook Error: checkout.session.completed event is missing subscription or customer ID.`);
                }
                break;
            }

            // These events are sent for any change in a subscription's status, including creation.
            // They are useful for keeping our database in sync with Stripe.
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                if (subscription.customer) {
                    await manageSubscriptionStatusChange(subscription.id, subscription.customer as string);
                } else {
                    console.error(`Webhook Error: ${event.type} event is missing customer ID.`);
                }
                break;
            }

            // These events can handle subscription renewals or other direct invoice payments.
            case 'invoice.paid':
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                // Ensure the invoice is linked to a subscription and customer before processing.
                if (invoice.subscription && invoice.customer) {
                    await manageSubscriptionStatusChange(invoice.subscription as string, invoice.customer as string);
                }
                break;
            }

            // This event handles when a subscription is cancelled.
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                // Find the local subscription record to identify the user.
                const localSub = await db.select().from(subscriptionTable).where(eq(subscriptionTable.stripeSubscriptionId, subscription.id));

                if (localSub.length > 0) {
                    const customer = await db.select().from(customerTable).where(eq(customerTable.id, localSub[0].customerId));
                    if (customer.length > 0) {
                        // Revert the user's tier back to "free".
                        await db.update(userTable).set({ tier: "free" }).where(eq(userTable.id, customer[0].userId));
                        console.log(`✅ User tier set to "free" for userId: ${customer[0].userId}`);
                    }
                    // Remove the subscription record from our database.
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

    // 3. Acknowledge receipt of the event with a 200 status code
    return new NextResponse(null, { status: 200 });
}
