import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { svc } = auth;

  const body = await request.json() as { phrase: string; category?: string };
  if (!body.phrase?.trim()) return NextResponse.json({ error: "phrase required" }, { status: 400 });

  const { data, error } = await (svc as any)
    .from("reddit_keywords")
    .insert({ phrase: body.phrase.trim(), category: body.category?.trim() || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { svc } = auth;

  const body = await request.json() as { id: string; is_active?: boolean; category?: string };
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await (svc as any)
    .from("reddit_keywords")
    .update(updates)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { svc } = auth;

  const { id } = await request.json() as { id: string };
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await (svc as any).from("reddit_keywords").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
