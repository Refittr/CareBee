import { createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RedditHitsClient } from "./RedditHitsClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reddit Monitor | CareBee Admin" };
export const dynamic = "force-dynamic";

export interface RedditHit {
  id: string;
  reddit_id: string;
  type: string;
  subreddit: string;
  title: string | null;
  body: string;
  author: string;
  url: string;
  matched_keyword: string;
  status: string;
  notes: string | null;
  found_at: string;
  created_at: string;
}

export default async function RedditPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const svc = await createServiceClient();

  const { data: profile } = await svc
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.account_type !== "admin") redirect("/dashboard");

  const [{ data: hits }, { data: keywords }, { data: subreddits }] = await Promise.all([
    (svc as any)
      .from("reddit_hits")
      .select("*")
      .order("found_at", { ascending: false })
      .limit(500),
    (svc as any)
      .from("reddit_keywords")
      .select("id, phrase, category, is_active")
      .order("category", { ascending: true })
      .order("phrase", { ascending: true }),
    (svc as any)
      .from("reddit_subreddits")
      .select("id, name, is_active")
      .order("name", { ascending: true }),
  ]);

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      <RedditHitsClient
        initialHits={(hits ?? []) as RedditHit[]}
        allSubreddits={(subreddits ?? []) as { id: string; name: string; is_active: boolean }[]}
        categories={
          Array.from(
            new Set(
              ((keywords ?? []) as { category: string | null }[])
                .map((k) => k.category)
                .filter(Boolean)
            )
          ) as string[]
        }
      />
    </div>
  );
}
