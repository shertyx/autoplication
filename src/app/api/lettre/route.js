import { GoogleGenerativeAI } from "@google/generative-ai";
import { Redis } from "@upstash/redis";
import { auth } from "@/auth";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export async function POST(request) {
  try {
    const session = await auth();
    const { entreprise, poste, offre, ton } = await request.json();

    let profil = null;
    if (session?.user?.email) {
      profil = await redis.get(`profil:${session.user.email}`);
    }

    const profilTexte = profil?.cv
      ? `${profil.nom || session?.user?.name || ""}\n${profil.poste ? "Poste recherché : " + profil.poste : ""}\n${profil.ville ? "Ville : " + profil.ville : ""}\n\nCV :\n${profil.cv}`
      : session?.user?.name
        ? `Candidat : ${session.user.name} (CV non renseigné)`
        : "Profil non renseigné.";

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Tu es expert en recrutement tech. Rédige une lettre de motivation en français.

PROFIL : ${profilTexte}
POSTE : ${poste} chez ${entreprise}
${offre ? `OFFRE : ${offre}` : ""}
TON : ${ton}

Rédige une lettre courte et percutante (~250 mots). Pas de formules bateau. Commence directement par le corps de la lettre sans entête postal. Termine par une formule de politesse.`;

    const result = await model.generateContent(prompt);
    const lettre = result.response.text();
    return Response.json({ lettre });
  } catch (error) {
    if (error.message?.includes("429")) {
      return Response.json({ error: "Quota Gemini épuisé, réessaie demain." });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
}
