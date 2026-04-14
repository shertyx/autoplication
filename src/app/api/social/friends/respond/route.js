import { Redis } from "@upstash/redis";
import { auth } from "@/auth";
import { limiters, checkRateLimit } from "@/lib/ratelimit";
import { isValidEmail, badRequest } from "@/lib/validate";

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ success: false }, { status: 401 });

  const blocked = await checkRateLimit(limiters.social, session.user.email);
  if (blocked) return blocked;

  const { fromEmail, action } = await request.json();

  // Valider les entrées
  if (!isValidEmail(fromEmail)) return badRequest("Email invalide");
  if (action !== "accept" && action !== "decline") return badRequest("Action invalide");

  const uid = session.user.email;
  const me = { email: uid, name: session.user.name, image: session.user.image };

  // IDOR fix : vérifier que fromEmail est bien dans les demandes reçues avant tout traitement
  const received = await redis.get(`requests:received:${uid}`);
  const receivedList = Array.isArray(received) ? received : [];
  const requestExists = receivedList.some((r) => r.email === fromEmail);
  if (!requestExists) return Response.json({ success: false, error: "Demande introuvable" }, { status: 404 });

  const newReceived = receivedList.filter((r) => r.email !== fromEmail);
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
