import { Redis } from "@upstash/redis";
import { auth } from "@/auth";

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return Response.json({}, { status: 401 });
  const uid = session.user.email;

  const [friends, received, sent] = await Promise.all([
    redis.get(`friends:${uid}`),
    redis.get(`requests:received:${uid}`),
    redis.get(`requests:sent:${uid}`),
  ]);

  return Response.json({
    friends: Array.isArray(friends) ? friends : [],
    received: Array.isArray(received) ? received : [],
    sent: Array.isArray(sent) ? sent : [],
  });
}
