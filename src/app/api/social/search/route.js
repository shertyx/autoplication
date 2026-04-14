import { Redis } from "@upstash/redis";
import { auth } from "@/auth";

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

export async function GET(request) {
  const session = await auth();
  if (!session?.user?.email) return Response.json([], { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase().trim();
  if (!q || q.length < 2) return Response.json([]);

  const all = await redis.hgetall("users:registry");
  if (!all) return Response.json([]);

  const results = Object.values(all)
    .map((v) => (typeof v === "string" ? JSON.parse(v) : v))
    .filter((u) =>
      u.email !== session.user.email &&
      (u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
    )
    .slice(0, 10);

  return Response.json(results);
}
