import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import type { PlanType } from "@/lib/types/database";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const householdId: string | null = body?.householdId ?? null;

  const svc = await createServiceClient();
  const { data: profile } = await svc
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ synced: false, reason: "no_customer" });
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: profile.stripe_customer_id,
    status: "all",
    limit: 10,
  });

  // Find the best subscription: active > trialing > past_due > others
  const priority = ["active", "trialing", "past_due", "canceled"];
  const sorted = [...subscriptions.data].sort(
    (a, b) => priority.indexOf(a.status) - priority.indexOf(b.status)
  );
  const sub = sorted[0];

  if (!sub) {
    return NextResponse.json({ synced: false, reason: "no_subscription" });
  }

  const isActive = sub.status === "active" || sub.status === "trialing";
  const isCancelledInPeriod = sub.cancel_at_period_end;
  const periodEnd = sub.items.data[0]?.current_period_end
    ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
    : null;
  const cancelAt = sub.cancel_at
    ? new Date(sub.cancel_at * 1000).toISOString()
    : null;

  const householdStatus = isCancelledInPeriod
    ? "cancelled"
    : isActive ? "active"
    : sub.status === "past_due" ? "past_due"
    : "free";

  await svc.from("profiles").update({
    stripe_subscription_id: sub.id,
    is_subscribed: isActive && !isCancelledInPeriod,
    subscription_status: sub.status,
    subscription_price_id: sub.items.data[0]?.price.id ?? null,
    subscription_current_period_end: periodEnd,
    plan: (isActive ? "plus" : "family") as PlanType,
  }).eq("id", user.id);

  // Update specific household if provided, otherwise all owned households
  const endsAt = isCancelledInPeriod ? cancelAt : periodEnd;

  if (householdId) {
    await svc.from("households").update({
      subscription_status: householdStatus,
      subscription_id: sub.id,
      subscription_started_at: isActive ? new Date(sub.start_date * 1000).toISOString() : null,
      subscription_ends_at: endsAt,
    }).eq("id", householdId);
  } else {
    const { data: owned } = await svc
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .eq("role", "owner");
    if (owned && owned.length > 0) {
      const ids = owned.map((m) => m.household_id as string);
      await svc.from("households").update({
        subscription_status: householdStatus,
        subscription_id: sub.id,
        subscription_started_at: isActive ? new Date(sub.start_date * 1000).toISOString() : null,
        subscription_ends_at: endsAt,
      }).in("id", ids);
    }
  }

  return NextResponse.json({ synced: true, status: sub.status, householdStatus });
}
