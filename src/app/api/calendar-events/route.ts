import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json() as {
    household_id: string;
    title: string;
    event_date: string;
    event_time?: string | null;
    notes?: string | null;
    category?: string;
  };

  const { household_id, title, event_date } = body;
  if (!household_id || !title || !event_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const svc = await createServiceClient();

  const { data: membership } = await svc
    .from("household_members")
    .select("role")
    .eq("household_id", household_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await svc
    .from("calendar_events")
    .insert({
      household_id,
      created_by: user.id,
      title: title.trim(),
      event_date,
      event_time: body.event_time ?? null,
      notes: body.notes?.trim() ?? null,
      category: body.category ?? "other",
    })
    .select("id, title, event_date, event_time, notes, category, created_by")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
