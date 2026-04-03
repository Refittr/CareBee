/**
 * Reddit scraper — runs as a standalone Node.js script (Node 18+)
 *
 * HOW TO GET YOUR REDDIT COOKIE:
 *   1. Open https://www.reddit.com in your browser while logged in
 *   2. Open DevTools (F12) → Network tab
 *   3. Click any request to www.reddit.com
 *   4. In the request headers, find the "Cookie" header
 *   5. Copy the entire value (it's a long string)
 *   6. Paste it as REDDIT_COOKIE in your .env.local
 *
 * USAGE:
 *   node scripts/reddit-scrape.js
 *
 * ENV VARS REQUIRED (in .env.local or exported):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   REDDIT_COOKIE
 */

// @ts-check
const { createClient } = require("@supabase/supabase-js");
const { readFileSync } = require("fs");
const { resolve } = require("path");

// Load .env.local manually (Node doesn't load it automatically)
try {
  const envPath = resolve(process.cwd(), ".env.local");
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env.local not found — rely on already-exported env vars
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REDDIT_COOKIE = process.env.REDDIT_COOKIE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}
if (!REDDIT_COOKIE) {
  console.error("ERROR: REDDIT_COOKIE is required. See instructions at the top of this file.");
  process.exit(1);
}

const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Cookie": REDDIT_COOKIE,
  "Accept": "application/json",
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fuzzy match: all words 4+ letters from the keyword phrase must appear in the text.
 */
function matches(phrase, text) {
  const words = phrase.toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
  const haystack = text.toLowerCase();
  return words.every((w) => haystack.includes(w));
}

async function redditFetch(url) {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      console.warn(`  Reddit ${res.status} for ${url}`);
      return null;
    }
    return res.json();
  } catch (err) {
    console.warn(`  Fetch error: ${err.message}`);
    return null;
  }
}

async function main() {
  // Load active keywords and subreddits
  const { data: keywords, error: kwErr } = await svc
    .from("reddit_keywords")
    .select("phrase")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (kwErr) { console.error("Failed to load keywords:", kwErr.message); process.exit(1); }
  if (!keywords?.length) { console.log("No active keywords found."); return; }

  const { data: subreddits, error: subErr } = await svc
    .from("reddit_subreddits")
    .select("name")
    .eq("is_active", true);

  if (subErr) { console.error("Failed to load subreddits:", subErr.message); process.exit(1); }
  if (!subreddits?.length) { console.log("No active subreddits found."); return; }

  const subredditNames = new Set(subreddits.map((s) => s.name.toLowerCase()));

  console.log(`\nStarting scrape: ${keywords.length} keywords × ${subreddits.length} subreddits\n`);

  let totalSearched = 0;
  let totalNewHits = 0;

  for (const kw of keywords) {
    const phrase = kw.phrase;
    const encoded = encodeURIComponent(phrase);

    // Per-subreddit post search
    for (const sub of subreddits) {
      const subName = sub.name;
      const url = `https://www.reddit.com/r/${subName}/search.json?q=${encoded}&restrict_sr=on&sort=new&t=month&limit=25`;
      const json = await redditFetch(url);
      totalSearched++;

      const children = json?.data?.children ?? [];
      const hits = [];

      for (const child of children) {
        const d = child.data;
        const title = d.title ?? "";
        const body = d.selftext ?? "";
        if (!matches(phrase, title + " " + body)) continue;
        hits.push({
          reddit_id: d.name,
          type: "post",
          subreddit: d.subreddit,
          title: title.slice(0, 500),
          body: body.slice(0, 2000),
          author: d.author,
          url: `https://www.reddit.com${d.permalink}`,
          matched_keyword: phrase,
          status: "new",
          found_at: new Date(d.created_utc * 1000).toISOString(),
        });
      }

      if (hits.length > 0) {
        const { error } = await svc
          .from("reddit_hits")
          .upsert(hits, { onConflict: "reddit_id", ignoreDuplicates: true });
        if (error) {
          console.warn(`  Upsert error (${subName}/${phrase}):`, error.message);
        } else {
          totalNewHits += hits.length;
          console.log(`  [posts] r/${subName} "${phrase}" → ${hits.length} hit(s)`);
        }
      } else {
        console.log(`  [posts] r/${subName} "${phrase}" → 0 hits`);
      }

      await sleep(500);
    }

    // Global comment search filtered to target subreddits
    const commentUrl = `https://www.reddit.com/search.json?q=${encoded}&sort=new&t=month&limit=25&type=comment`;
    const commentJson = await redditFetch(commentUrl);
    totalSearched++;

    const commentChildren = commentJson?.data?.children ?? [];
    const commentHits = [];

    for (const child of commentChildren) {
      const d = child.data;
      if (!subredditNames.has((d.subreddit ?? "").toLowerCase())) continue;
      const body = d.body ?? "";
      if (!matches(phrase, body)) continue;
      commentHits.push({
        reddit_id: d.name,
        type: "comment",
        subreddit: d.subreddit,
        title: `Comment in r/${d.subreddit}`,
        body: body.slice(0, 2000),
        author: d.author,
        url: `https://www.reddit.com${d.permalink}`,
        matched_keyword: phrase,
        status: "new",
        found_at: new Date(d.created_utc * 1000).toISOString(),
      });
    }

    if (commentHits.length > 0) {
      const { error } = await svc
        .from("reddit_hits")
        .upsert(commentHits, { onConflict: "reddit_id", ignoreDuplicates: true });
      if (error) {
        console.warn(`  Upsert error (comments/"${phrase}"):`, error.message);
      } else {
        totalNewHits += commentHits.length;
        console.log(`  [comments] "${phrase}" → ${commentHits.length} hit(s)`);
      }
    } else {
      console.log(`  [comments] "${phrase}" → 0 hits`);
    }

    await sleep(500);
  }

  console.log(`\n✓ Done. Searched ${totalSearched} endpoints. New hits upserted: ${totalNewHits}\n`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
