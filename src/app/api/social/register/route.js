import { Redis } from "@upstash/redis";
import { auth } from "@/auth";
import { limiters, checkRateLimit } from "@/lib/ratelimit";

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ success: false }, { status: 401 });

  const blocked = await checkRateLimit(limiters.social, session.user.email);
  if (blocked) return blocked;

  const { email, name, image } = session.user;
  await redis.hset("users:registry", { [email]: JSON.stringify({ email, name, image }) });
  return Response.json({ success: true });
}
