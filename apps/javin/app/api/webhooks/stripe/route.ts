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
    // Find our internal customer record using the Stripe customer ID
    const customer = await db.select().from(customerTable).where(eq(customerTable.stripeCustomerId, customerId));
    if (customer.length === 0) {
        console.error(`Webhook Error: Could not find customer in DB with Stripe customer ID: ${customerId}`);
        return;
    }

    // Retrieve the full subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Correctly handle trial periods by using trial_end as a fallback for the period end date
    const periodEndTimestamp = subscription.current_period_end ?? subscription.trial_end;
    if (typeof periodEndTimestamp !== 'number') {
        console.error(`Webhook Error: Subscription ${subscription.id} is missing a valid period end date.`);
        return;
    }
    const periodEndDate = new Date(periodEndTimestamp * 1000);

    // Check if we already have this subscription in our database
    const existingSubscription = await db.select().from(subscriptionTable).where(eq(subscriptionTable.stripeSubscriptionId, subscription.id));

    if (existingSubscription.length === 0) {
        // This is a new subscription, so we create a new record for it.
        await db.insert(subscriptionTable).values({
            customerId: customer[0].id,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: periodEndDate,
        });
        console.log(`✅ New subscription record created for customer: ${customer[0].id}`);
    } else {
        // This is an existing subscription (e.g., a renewal or plan change), so we update it.
        await db.update(subscriptionTable)
            .set({
                stripePriceId: subscription.items.data[0].price.id,
                stripeCurrentPeriodEnd: periodEndDate,
            })
            .where(eq(subscriptionTable.stripeSubscriptionId, subscription.id));
        console.log(`✅ Existing subscription record updated for customer: ${customer[0].id}`);
    }
    
    // Finally, update the user's tier to "pro", granting them access to features.
    await db.update(userTable)
        .set({ tier: "pro" }) // <-- UPDATED FROM "premium" to "pro"
        .where(eq(userTable.id, customer[0].userId));
    console.log(`✅ User tier set to "pro" for userId: ${customer[0].userId}`);
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
            // This event is the most reliable for granting access after a successful payment.
            case 'invoice.paid': {
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

