import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { svc } = auth;

  const body = await request.json() as { name: string };
  const name = body.name?.trim().replace(/^r\//, "");
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const { data, error } = await (svc as any)
    .from("reddit_subreddits")
    .insert({ name })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { svc } = auth;

  const body = await request.json() as { id: string; is_active: boolean };
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await (svc as any)
    .from("reddit_subreddits")
    .update({ is_active: body.is_active })
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { svc } = auth;

  const { id } = await request.json() as { id: string };
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await (svc as any).from("reddit_subreddits").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
