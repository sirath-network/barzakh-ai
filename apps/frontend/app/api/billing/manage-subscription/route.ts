import { auth } from "@/app/(auth)/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db/db";
import { customer as customerTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST() {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customers = await db.select().from(customerTable).where(eq(customerTable.userId, session.user.id!));

    if (customers.length === 0) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const { url } = await stripe.billingPortal.sessions.create({
        customer: customers[0].stripeCustomerId,
        return_url: `${process.env.PUBLIC_BASE_URL}`,
    });

    return NextResponse.json({ url });
}
