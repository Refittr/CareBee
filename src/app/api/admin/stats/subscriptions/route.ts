import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { svc } = auth;

  const now = new Date().toISOString();

  const [
    { count: active },
    { count: inTrial },
    { count: trialExpired },
    { count: freePlan },
    { count: cancelled },
  ] = await Promise.all([
    svc.from("households").select("*", { count: "exact", head: true }).eq("subscription_status", "active"),
    svc.from("households").select("*", { count: "exact", head: true }).eq("subscription_status", "trial").gt("trial_ends_at", now),
    svc.from("households").select("*", { count: "exact", head: true }).eq("subscription_status", "trial").lte("trial_ends_at", now),
    svc.from("households").select("*", { count: "exact", head: true }).eq("subscription_status", "free"),
    svc.from("households").select("*", { count: "exact", head: true }).eq("subscription_status", "cancelled"),
  ]);

  const activeCount = active ?? 0;
  const expiredCount = (trialExpired ?? 0) + (freePlan ?? 0);
  const cancelledCount = cancelled ?? 0;
  const denominator = activeCount + expiredCount + cancelledCount;
  const conversionRate = denominator > 0 ? ((activeCount / denominator) * 100).toFixed(1) : "0.0";
  const estimatedMrr = (activeCount * 4.99).toFixed(2);

  return NextResponse.json({
    active: activeCount,
    inTrial: inTrial ?? 0,
    trialExpired: expiredCount,
    cancelled: cancelledCount,
    conversionRate,
    estimatedMrr,
  });
}
