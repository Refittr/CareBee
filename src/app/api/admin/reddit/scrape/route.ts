import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { batch } = await request.json() as { batch: number };

  const url = `https://dxwgnnbjmafgcwweuwbf.supabase.co/functions/v1/reddit-monitor?batch=${batch ?? 1}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
  });

  const text = await res.text();
  if (!res.ok) return NextResponse.json({ error: text }, { status: res.status });
  return NextResponse.json({ ok: true, message: text });
}
