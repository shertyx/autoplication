import { Redis } from "@upstash/redis";
import { auth } from "@/auth";
import { sanitize } from "@/lib/validate";
import { limiters, checkRateLimit } from "@/lib/ratelimit";

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
  const blocked = await checkRateLimit(limiters.write, session.user.email);
  if (blocked) return blocked;
  const raw = await request.json();
  const data = {
    nom: sanitize(raw.nom, 100),
    poste: sanitize(raw.poste, 150),
    ville: sanitize(raw.ville, 100),
    cv: sanitize(raw.cv, 50000),
  };
  await redis.set(`profil:${session.user.email}`, data);
  return Response.json({ success: true });
}
