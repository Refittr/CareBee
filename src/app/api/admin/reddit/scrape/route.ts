import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const REDDIT_UA = "CareBeeBot/1.0";
const BATCH_SIZE = 10;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function redditFetch(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": REDDIT_UA },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function POST(request: NextRequest) {
  // Auth — admin only
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const svc = await createServiceClient();

  const { data: profile } = await svc
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const batchParam = request.nextUrl.searchParams.get("batch");
  const batch = batchParam ? parseInt(batchParam, 10) : 1;
  if (isNaN(batch) || batch < 1) {
    return NextResponse.json({ error: "Invalid batch param" }, { status: 400 });
  }

  const offset = (batch - 1) * BATCH_SIZE;

  const { data: keywords } = await svc
    .from("reddit_keywords")
    .select("phrase")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .range(offset, offset + BATCH_SIZE - 1);

  if (!keywords?.length) {
    return NextResponse.json({ searched: 0, new_hits: 0, keywords: 0, subreddits: 0, batch, timestamp: new Date().toISOString() });
  }

  const { data: subreddits } = await svc
    .from("reddit_subreddits")
    .select("name")
    .eq("is_active", true);

  if (!subreddits?.length) {
    return NextResponse.json({ searched: 0, new_hits: 0, keywords: keywords.length, subreddits: 0, batch, timestamp: new Date().toISOString() });
  }

  const subredditNames = new Set(subreddits.map((s) => (s.name as string).toLowerCase()));

  let searched = 0;
  let new_hits = 0;

  for (const kw of keywords) {
    const phrase = kw.phrase as string;
    const encodedPhrase = encodeURIComponent(phrase);

    // Per-subreddit post search
    for (const sub of subreddits) {
      const subName = sub.name as string;
      const url = `https://www.reddit.com/r/${subName}/search.json?q=${encodedPhrase}&restrict_sr=on&sort=new&t=week&limit=15`;
      const json = await redditFetch(url) as { data?: { children?: { data: Record<string, unknown> }[] } } | null;
      searched++;

      const posts = json?.data?.children ?? [];
      const hits: Record<string, unknown>[] = [];

      for (const child of posts) {
        const d = child.data;
        const title = (d.title as string) ?? "";
        const selftext = (d.selftext as string) ?? "";
        if (!(title + " " + selftext).toLowerCase().includes(phrase.toLowerCase())) continue;
        hits.push({
          reddit_id: d.name as string,
          type: "post",
          subreddit: d.subreddit as string,
          title: title.slice(0, 500),
          body: selftext.slice(0, 2000),
          author: d.author as string,
          url: `https://www.reddit.com${d.permalink as string}`,
          matched_keyword: phrase,
          status: "new",
          found_at: new Date((d.created_utc as number) * 1000).toISOString(),
        });
      }

      if (hits.length > 0) {
        const { error } = await svc
          .from("reddit_hits")
          .upsert(hits, { onConflict: "reddit_id", ignoreDuplicates: true });
        if (!error) new_hits += hits.length;
      }

      await sleep(1500);
    }

    // Global comment search filtered to target subreddits
    const commentUrl = `https://www.reddit.com/search.json?q=${encodedPhrase}&sort=new&t=week&limit=15&type=comment`;
    const commentJson = await redditFetch(commentUrl) as { data?: { children?: { data: Record<string, unknown> }[] } } | null;
    searched++;

    const commentHits: Record<string, unknown>[] = [];
    for (const child of commentJson?.data?.children ?? []) {
      const d = child.data;
      if (!subredditNames.has(((d.subreddit as string) ?? "").toLowerCase())) continue;
      const body = (d.body as string) ?? "";
      if (!body.toLowerCase().includes(phrase.toLowerCase())) continue;
      commentHits.push({
        reddit_id: d.name as string,
        type: "comment",
        subreddit: d.subreddit as string,
        title: `Comment in r/${d.subreddit}`,
        body: body.slice(0, 2000),
        author: d.author as string,
        url: `https://www.reddit.com${d.permalink as string}`,
        matched_keyword: phrase,
        status: "new",
        found_at: new Date((d.created_utc as number) * 1000).toISOString(),
      });
    }

    if (commentHits.length > 0) {
      const { error } = await svc
        .from("reddit_hits")
        .upsert(commentHits, { onConflict: "reddit_id", ignoreDuplicates: true });
      if (!error) new_hits += commentHits.length;
    }

    await sleep(1500);
  }

  return NextResponse.json({
    searched,
    new_hits,
    keywords: keywords.length,
    subreddits: subreddits.length,
    batch,
    timestamp: new Date().toISOString(),
  });
}
