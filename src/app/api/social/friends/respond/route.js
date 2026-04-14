import { Redis } from "@upstash/redis";
import { auth } from "@/auth";

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ success: false }, { status: 401 });

  const { fromEmail, action } = await request.json(); // action: "accept" | "decline"
  const uid = session.user.email;
  const me = { email: uid, name: session.user.name, image: session.user.image };

  // Supprimer la demande des received
  const received = await redis.get(`requests:received:${uid}`);
  const newReceived = (Array.isArray(received) ? received : []).filter((r) => r.email !== fromEmail);
  await redis.set(`requests:received:${uid}`, newReceived);

  // Supprimer la demande des sent de l'expéditeur
  const sent = await redis.get(`requests:sent:${fromEmail}`);
  const newSent = (Array.isArray(sent) ? sent : []).filter((r) => r.email !== uid);
  await redis.set(`requests:sent:${fromEmail}`, newSent);

  if (action === "accept") {
    const fromUser = await redis.hget("users:registry", fromEmail);
    const from = typeof fromUser === "string" ? JSON.parse(fromUser) : fromUser;

    // Ajouter dans les amis des deux
    const [myFriends, theirFriends] = await Promise.all([
      redis.get(`friends:${uid}`),
      redis.get(`friends:${fromEmail}`),
    ]);
    await redis.set(`friends:${uid}`, [...(Array.isArray(myFriends) ? myFriends : []), from]);
    await redis.set(`friends:${fromEmail}`, [...(Array.isArray(theirFriends) ? theirFriends : []), me]);

    // Notification pour l'expéditeur
    const notifs = await redis.get(`notifications:${fromEmail}`);
    const newNotifs = [...(Array.isArray(notifs) ? notifs : []), {
      id: Date.now(),
      type: "friend_accepted",
      from: me,
      message: `${me.name} a accepté votre demande d'ami`,
      date: new Date().toISOString(),
      read: false,
    }];
    await redis.set(`notifications:${fromEmail}`, newNotifs);
  }

  return Response.json({ success: true });
}
