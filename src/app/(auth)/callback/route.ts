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
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Ensure the user has a profile — plug the gap if the trigger failed
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const svc = await createServiceClient();
        const { data: existing } = await svc
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!existing) {
          await svc.from("profiles").insert({
            id: user.id,
            email: user.email ?? "",
            full_name:
              (user.user_metadata?.full_name as string | undefined) ??
              (user.user_metadata?.name as string | undefined) ??
              "",
          });
        }
      }

      // If no explicit next destination, show the confirmation success page
      const destination = next ? safePath : "/email-confirmed";
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
