import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { applyPlanLapse, applyHouseholdLocks } from "@/lib/lapse-utils";
import {
  sendPlanLapseDay1Email,
  sendPlanLapseDay5Email,
  sendPlanLapseDay7Email,
} from "@/lib/email";

// Secured: callable by Vercel Cron (Authorization: Bearer <CRON_SECRET>)
// Runs daily at 09:00 UTC.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.carebee.co.uk";

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const svc = await createServiceClient();
  const results: string[] = [];

  // -------------------------------------------------------------------------
  // 1. Detect newly-expired in-app trials (no Stripe subscription)
  // -------------------------------------------------------------------------
  // Users whose trial_ends_at has passed, are not subscribed, have a paid plan,
  // and haven't had plan_lapsed_at set yet.
  const { data: expiredTrials } = await svc
    .from("profiles")
    .select("id, email, full_name")
    .lt("trial_ends_at", new Date().toISOString())
    .eq("is_subscribed", false)
    .neq("plan", "free")
    .is("plan_lapsed_at", null);

  for (const profile of expiredTrials ?? []) {
    await applyPlanLapse(profile.id);
    results.push(`trial-expired: ${profile.id}`);
  }

  // -------------------------------------------------------------------------
  // 2. Process grace period emails and locking for all lapsed users
  // -------------------------------------------------------------------------
  const { data: lapsedProfiles } = await svc
    .from("profiles")
    .select("id, email, full_name, plan_lapsed_at, lapse_email_step")
    .eq("plan", "free")
    .not("plan_lapsed_at", "is", null);

  for (const profile of lapsedProfiles ?? []) {
    if (!profile.plan_lapsed_at) continue;

    const days = daysSince(profile.plan_lapsed_at);
    const step = profile.lapse_email_step ?? 0;
    const name = profile.full_name ?? profile.email;

    try {
      if (days >= 7 && step < 7) {
        // Lock secondary households and send final email
        await applyHouseholdLocks(profile.id);
        await sendPlanLapseDay7Email({ to: profile.email, name, appUrl: APP_URL });
        await svc.from("profiles").update({ lapse_email_step: 7 }).eq("id", profile.id);
        results.push(`locked+day7-email: ${profile.id}`);
      } else if (days >= 5 && step < 5) {
        await sendPlanLapseDay5Email({ to: profile.email, name, appUrl: APP_URL });
        await svc.from("profiles").update({ lapse_email_step: 5 }).eq("id", profile.id);
        results.push(`day5-email: ${profile.id}`);
      } else if (days >= 0 && step < 1) {
        await sendPlanLapseDay1Email({ to: profile.email, name, appUrl: APP_URL });
        await svc.from("profiles").update({ lapse_email_step: 1 }).eq("id", profile.id);
        results.push(`day1-email: ${profile.id}`);
      }
    } catch (err) {
      console.error(`[trial-expiry] Error processing ${profile.id}:`, err);
      results.push(`error: ${profile.id}`);
    }
  }

  console.log(`[trial-expiry] Done. ${results.length} actions:`, results.join(", ") || "none");
  return NextResponse.json({ ok: true, actions: results });
}
