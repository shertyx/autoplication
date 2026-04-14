import { Redis } from "@upstash/redis";
import { auth } from "@/auth";
import { limiters, checkRateLimit } from "@/lib/ratelimit";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ candidatures: [], corbeille: [] }, { status: 401 });
  }
  const uid = session.user.email;
  try {
    const candidatures = await redis.get(`candidatures:${uid}`);
    const corbeille = await redis.get(`corbeille:${uid}`);
    return Response.json({
      candidatures: Array.isArray(candidatures) ? candidatures : [],
      corbeille: Array.isArray(corbeille) ? corbeille : [],
    });
  } catch {
    return Response.json({ candidatures: [], corbeille: [] });
  }
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ success: false }, { status: 401 });
  }
  const blocked = await checkRateLimit(limiters.write, session.user.email);
  if (blocked) return blocked;
  const uid = session.user.email;
  try {
    const { candidatures, corbeille } = await request.json();
    await redis.set(`candidatures:${uid}`, candidatures);
    await redis.set(`corbeille:${uid}`, corbeille);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, error: "Erreur lors de la sauvegarde." }, { status: 500 });
  }
}
