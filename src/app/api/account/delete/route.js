import { Redis } from "@upstash/redis";
import { auth } from "@/auth";

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ success: false }, { status: 401 });

  const uid = session.user.email;

  // Supprimer toutes les données de l'utilisateur
  await Promise.all([
    redis.del(`candidatures:${uid}`),
    redis.del(`corbeille:${uid}`),
    redis.del(`profil:${uid}`),
    redis.del(`offres:${uid}`),
    redis.del(`friends:${uid}`),
    redis.del(`requests:sent:${uid}`),
    redis.del(`requests:received:${uid}`),
    redis.del(`notifications:${uid}`),
  ]);

  // Supprimer du registre utilisateurs
  await redis.hdel("users:registry", uid);

  // Supprimer des listes d'amis des autres utilisateurs
  const friends = await redis.get(`friends:${uid}`);
  if (Array.isArray(friends)) {
    for (const friend of friends) {
      const theirFriends = await redis.get(`friends:${friend.email}`);
      if (Array.isArray(theirFriends)) {
        await redis.set(`friends:${friend.email}`, theirFriends.filter((f) => f.email !== uid));
      }
    }
  }

  // Supprimer les conversations (clés chat:*|uid ou chat:uid|*)
  try {
    const chatKeys = await redis.keys(`chat:*${uid}*`);
    if (chatKeys.length > 0) await Promise.all(chatKeys.map((k) => redis.del(k)));
  } catch {}

  return Response.json({ success: true });
}
