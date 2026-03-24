import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  const safePath =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Safety net: ensure profile exists (trigger may have silently failed)
      const svc = await createServiceClient();
      const { data: existing } = await svc
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!existing) {
        await svc.from("profiles").insert({
          id: data.user.id,
          email: data.user.email ?? "",
          full_name: data.user.user_metadata?.full_name ?? null,
        });
      }

      // If no explicit next destination, this is an email confirmation — show success page
      const destination = next ? safePath : "/email-confirmed";
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
