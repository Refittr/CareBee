import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { KeywordsClient } from "./KeywordsClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Keywords | Reddit Monitor | CareBee Admin" };
export const dynamic = "force-dynamic";

export interface RedditKeyword {
  id: string;
  phrase: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
  hit_count?: number;
}

export default async function KeywordsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const svc = await createServiceClient();
  const { data: profile } = await svc
    .from("profiles").select("account_type").eq("id", user.id).maybeSingle();
  if (profile?.account_type !== "admin") redirect("/dashboard");

  const [{ data: keywords }, { data: hitCounts }] = await Promise.all([
    (svc as any)
      .from("reddit_keywords")
      .select("id, phrase, category, is_active, created_at")
      .order("category", { ascending: true })
      .order("phrase", { ascending: true }),
    (svc as any)
      .from("reddit_hits")
      .select("matched_keyword"),
  ]);

  const countMap: Record<string, number> = {};
  for (const h of (hitCounts ?? []) as { matched_keyword: string }[]) {
    countMap[h.matched_keyword] = (countMap[h.matched_keyword] ?? 0) + 1;
  }

  const enriched: RedditKeyword[] = ((keywords ?? []) as RedditKeyword[]).map((k) => ({
    ...k,
    hit_count: countMap[k.phrase] ?? 0,
  }));

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <KeywordsClient initialKeywords={enriched} />
    </div>
  );
}
