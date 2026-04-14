import { Redis } from "@upstash/redis";
import { auth } from "@/auth";

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return Response.json({}, { status: 401 });

  const quota = {};

  // SerpAPI — endpoint officiel
  try {
    const res = await fetch(`https://serpapi.com/account.json?api_key=${process.env.SERP_API_KEY}`);
    if (res.ok) {
      const data = await res.json();
      quota.serpapi = {
        used: data.this_month_usage ?? null,
        limit: data.plan_searches_left != null ? (data.this_month_usage ?? 0) + data.plan_searches_left : null,
        remaining: data.plan_searches_left ?? null,
      };
    }
  } catch {}

  // JSearch — quota stocké lors du dernier scraping
  const jsearchQuota = await redis.get("quota:jsearch");
  if (jsearchQuota) quota.jsearch = jsearchQuota;

  // Gemini — compteur stocké dans Redis
  const geminiUsed = await redis.get("quota:gemini");
  quota.gemini = { used: geminiUsed ?? 0, limit: null, note: "Quota journalier Gemini 2.0 Flash" };

  return Response.json(quota);
}
