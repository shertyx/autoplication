import { Redis } from "@upstash/redis";
import { auth } from "@/auth";

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

function chatKey(a, b) {
  return `chat:${[a, b].sort().join("|")}`;
}

export async function GET(request) {
  const session = await auth();
  if (!session?.user?.email) return Response.json([], { status: 401 });

  const { searchParams } = new URL(request.url);
  const friendEmail = searchParams.get("with");
  if (!friendEmail) return Response.json([]);

  const messages = await redis.get(chatKey(session.user.email, friendEmail));
  return Response.json(Array.isArray(messages) ? messages : []);
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ success: false }, { status: 401 });

  const { toEmail, text } = await request.json();
  if (!toEmail || !text?.trim()) return Response.json({ success: false });

  const key = chatKey(session.user.email, toEmail);
  const messages = await redis.get(key);
  const newMessages = [
    ...(Array.isArray(messages) ? messages : []),
    {
      id: Date.now(),
      from: session.user.email,
      fromName: session.user.name,
      fromImage: session.user.image,
      text: text.trim(),
      date: new Date().toISOString(),
    },
  ];
  // Garder les 200 derniers messages
  const trimmed = newMessages.slice(-200);
  await redis.set(key, trimmed);

  // Notification si destinataire pas déjà notifié récemment
  const notifs = await redis.get(`notifications:${toEmail}`);
  const notifsList = Array.isArray(notifs) ? notifs : [];
  const recentMsg = notifsList.find(
    (n) => n.type === "message" && n.from.email === session.user.email && !n.read
  );
  if (!recentMsg) {
    await redis.set(`notifications:${toEmail}`, [
      ...notifsList,
      {
        id: Date.now(),
        type: "message",
        from: { email: session.user.email, name: session.user.name, image: session.user.image },
        message: `${session.user.name} vous a envoyé un message`,
        date: new Date().toISOString(),
        read: false,
      },
    ]);
  }

  return Response.json({ success: true });
}
