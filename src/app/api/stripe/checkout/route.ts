import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { getValidPriceIds, priceIdToPlan } from "@/lib/stripe-config";
import type { UserType } from "@/lib/types/database";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { priceId, householdId } = body as { priceId?: string; householdId?: string };

  if (!priceId) {
    return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
  }
  if (!householdId) {
    return NextResponse.json({ error: "Missing householdId" }, { status: 400 });
  }

  const svc = await createServiceClient();
  const { data: profile } = await svc
    .from("profiles")
    .select("stripe_customer_id, email, user_type")
    .eq("id", user.id)
    .maybeSingle();

  // Validate that the price ID is permitted for this user's user_type
  const userType = (profile?.user_type as UserType | null) ?? null;
  const validPriceIds = getValidPriceIds(userType);
  if (!validPriceIds.includes(priceId)) {
    return NextResponse.json({ error: "Invalid price for your account type." }, { status: 400 });
  }

  let customerId: string | undefined = profile?.stripe_customer_id ?? undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await svc.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const origin = request.nextUrl.origin;
  const plan = priceIdToPlan(priceId);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/settings?status=success`,
    cancel_url: `${origin}/settings`,
    allow_promotion_codes: true,
    metadata: { supabase_user_id: user.id, household_id: householdId, plan },
    subscription_data: {
      metadata: { supabase_user_id: user.id, household_id: householdId, plan },
    },
  });

  return NextResponse.json({ url: session.url });
}
