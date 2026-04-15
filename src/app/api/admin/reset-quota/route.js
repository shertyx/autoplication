import { Redis } from "@upstash/redis";
import { auth } from "@/auth";

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

const ADMIN_EMAIL = "fcaron59126@gmail.com";

export async function POST() {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) return Response.json({}, { status: 403 });

  await redis.del("quota:gemini:daily");

  return Response.json({ ok: true });
}
