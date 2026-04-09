import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export async function GET() {
  try {
    const candidatures = await redis.get("candidatures");
    const corbeille = await redis.get("corbeille");
    return Response.json({
      candidatures: candidatures ? JSON.parse(candidatures) : [],
      corbeille: corbeille ? JSON.parse(corbeille) : [],
    });
  } catch {
    return Response.json({ candidatures: [], corbeille: [] });
  }
}

export async function POST(request) {
  try {
    const { candidatures, corbeille } = await request.json();
    await redis.set("candidatures", JSON.stringify(candidatures));
    await redis.set("corbeille", JSON.stringify(corbeille));
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}