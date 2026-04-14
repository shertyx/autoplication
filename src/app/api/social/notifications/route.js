import { Redis } from "@upstash/redis";
import { auth } from "@/auth";
import { limiters, checkRateLimit } from "@/lib/ratelimit";

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return Response.json([], { status: 401 });
  const blocked = await checkRateLimit(limiters.notifications, session.user.email);
  if (blocked) return blocked;
  const notifs = await redis.get(`notifications:${session.user.email}`);
  return Response.json(Array.isArray(notifs) ? notifs : []);
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ success: false }, { status: 401 });
  const blocked = await checkRateLimit(limiters.social, session.user.email);
  if (blocked) return blocked;
  const notifs = await redis.get(`notifications:${session.user.email}`);
  const read = (Array.isArray(notifs) ? notifs : []).map((n) => ({ ...n, read: true }));
  await redis.set(`notifications:${session.user.email}`, read);
  return Response.json({ success: true });
}
