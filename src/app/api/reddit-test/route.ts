export async function GET() {
  try {
    const res = await fetch(
      "https://www.reddit.com/r/AskUK/search.json?q=carer&restrict_sr=on&sort=new&t=month&limit=3",
      { headers: { "User-Agent": "CareBeeBot/1.0" } }
    );
    const body = await res.text();
    return Response.json({
      status: res.status,
      has_data: body.includes('"children"'),
      snippet: body.substring(0, 500),
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}