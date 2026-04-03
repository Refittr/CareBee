import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SubredditsClient } from "./SubredditsClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Subreddits | Reddit Monitor | CareBee Admin" };
export const dynamic = "force-dynamic";

export interface RedditSubreddit {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  hit_count?: number;
}

export default async function SubredditsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const svc = await createServiceClient();
  const { data: profile } = await svc
    .from("profiles").select("account_type").eq("id", user.id).maybeSingle();
  if (profile?.account_type !== "admin") redirect("/dashboard");

  const [{ data: subreddits }, { data: hitCounts }] = await Promise.all([
    (svc as any)
      .from("reddit_subreddits")
      .select("id, name, is_active, created_at")
      .order("name", { ascending: true }),
    (svc as any)
      .from("reddit_hits")
      .select("subreddit"),
  ]);

  const countMap: Record<string, number> = {};
  for (const h of (hitCounts ?? []) as { subreddit: string }[]) {
    countMap[h.subreddit] = (countMap[h.subreddit] ?? 0) + 1;
  }

  const enriched: RedditSubreddit[] = ((subreddits ?? []) as RedditSubreddit[]).map((s) => ({
    ...s,
    hit_count: countMap[s.name] ?? 0,
  }));

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <SubredditsClient initialSubreddits={enriched} />
    </div>
  );
}
