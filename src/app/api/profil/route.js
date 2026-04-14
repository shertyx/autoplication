import { Redis } from "@upstash/redis";
import { auth } from "@/auth";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return Response.json({}, { status: 401 });
  const profil = await redis.get(`profil:${session.user.email}`);
  return Response.json(profil || {});
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ success: false }, { status: 401 });
  const data = await request.json();
  await redis.set(`profil:${session.user.email}`, data);
  return Response.json({ success: true });
}
