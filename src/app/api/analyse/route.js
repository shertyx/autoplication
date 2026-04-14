import { GoogleGenerativeAI } from "@google/generative-ai";
import { Redis } from "@upstash/redis";
import { auth } from "@/auth";
import { limiters, checkRateLimit } from "@/lib/ratelimit";
import { sanitize, badRequest } from "@/lib/validate";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) return Response.json({ error: "Non autorisé" }, { status: 401 });

    const blocked = await checkRateLimit(limiters.ai, session.user.email);
    if (blocked) return blocked;

    const body = await request.json();
    const offre = sanitize(body.offre, 8000);
    if (!offre) return badRequest("Offre manquante");

    let profil = null;
    if (session?.user?.email) {
      profil = await redis.get(`profil:${session.user.email}`);
    }

    const profilTexte = profil?.cv
      ? `${profil.nom || session?.user?.name || ""}\n${profil.poste ? "Poste recherché : " + profil.poste : ""}\n${profil.ville ? "Ville : " + profil.ville : ""}\n\nCV :\n${profil.cv}`
      : session?.user?.name
        ? `Candidat : ${session.user.name} (CV non renseigné)`
        : "Profil non renseigné.";

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Tu es un expert RH. Analyse la compatibilité entre ce profil et cette offre.

PROFIL :
${profilTexte}

OFFRE :
${offre}

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks :
{"score": 75, "competences_ok": ["Python","SQL"], "competences_manquantes": ["Spark"], "resume": "3-4 phrases sur le match, points forts et points à améliorer."}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const clean = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(clean);
    return Response.json(data);
  } catch (error) {
    if (error.message?.includes("429")) {
      return Response.json({ error: "Quota Gemini épuisé, réessaie demain." }, { status: 429 });
    }
    return Response.json({ error: "Erreur lors de l'analyse." }, { status: 500 });
  }
}
