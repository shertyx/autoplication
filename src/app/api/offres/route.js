import { Redis } from "@upstash/redis";
import { auth } from "@/auth";
import { getClientIp } from "@/lib/ratelimit";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export async function GET(request) {
  const session = await auth();
  const userKey = session?.user?.email ?? `ip:${getClientIp(request)}`;

  try {
    const data = await redis.get(`offres:${userKey}`);
    if (!data) return Response.json({ last_update: null, total: 0, offres: [] });
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    return Response.json(parsed);
  } catch {
    return Response.json({ last_update: null, total: 0, offres: [] });
  }
}
