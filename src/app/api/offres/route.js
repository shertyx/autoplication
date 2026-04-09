import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export async function GET() {
  try {
    const data = await redis.get("offres");
    if (!data) {
      return Response.json({ last_update: null, total: 0, offres: [] });
    }
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    return Response.json(parsed);
  } catch (error) {
    return Response.json({ last_update: null, total: 0, offres: [] });
  }
}