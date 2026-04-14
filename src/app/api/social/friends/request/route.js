import { Redis } from "@upstash/redis";
import { auth } from "@/auth";

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ success: false }, { status: 401 });

  const { toEmail } = await request.json();
  if (!toEmail || toEmail === session.user.email) return Response.json({ success: false });

  const from = { email: session.user.email, name: session.user.name, image: session.user.image };
  const toUser = await redis.hget("users:registry", toEmail);
  if (!toUser) return Response.json({ success: false, error: "Utilisateur introuvable" });

  const to = typeof toUser === "string" ? JSON.parse(toUser) : toUser;

  // Vérifier si déjà amis ou demande déjà envoyée
  const [friends, sent] = await Promise.all([
    redis.get(`friends:${session.user.email}`),
    redis.get(`requests:sent:${session.user.email}`),
  ]);
  const alreadyFriend = (Array.isArray(friends) ? friends : []).some((f) => f.email === toEmail);
  const alreadySent = (Array.isArray(sent) ? sent : []).some((r) => r.email === toEmail);
  if (alreadyFriend) return Response.json({ success: false, error: "Déjà ami" });
  if (alreadySent) return Response.json({ success: false, error: "Demande déjà envoyée" });

  const date = new Date().toISOString();

  // Ajouter dans sent de l'expéditeur
  const newSent = [...(Array.isArray(sent) ? sent : []), { ...to, date }];
  await redis.set(`requests:sent:${session.user.email}`, newSent);

  // Ajouter dans received du destinataire
  const received = await redis.get(`requests:received:${toEmail}`);
  const newReceived = [...(Array.isArray(received) ? received : []), { ...from, date }];
  await redis.set(`requests:received:${toEmail}`, newReceived);

  // Notification
  const notifs = await redis.get(`notifications:${toEmail}`);
  const newNotifs = [...(Array.isArray(notifs) ? notifs : []), {
    id: Date.now(),
    type: "friend_request",
    from,
    message: `${from.name} vous a envoyé une demande d'ami`,
    date,
    read: false,
  }];
  await redis.set(`notifications:${toEmail}`, newNotifs);

  return Response.json({ success: true });
}
