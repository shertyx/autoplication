import { Redis } from "@upstash/redis";
import { auth } from "@/auth";

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return Response.json({});
  const analyses = (await redis.get(`analyses:${session.user.email}`)) ?? {};
  return Response.json(analyses);
}

export async function DELETE(request) {
  const session = await auth();
  if (!session?.user?.email) return Response.json({}, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({}, { status: 400 });

  const key = `analyses:${session.user.email}`;
  const existing = (await redis.get(key)) ?? {};
  delete existing[id];
  await redis.set(key, existing);

  return Response.json({ ok: true });
}
