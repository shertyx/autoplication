import Groq from "groq-sdk";
import { auth } from "@/auth";
import { limiters, guestLimiters, checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { sanitize, badRequest } from "@/lib/validate";
import { getProfil } from "@/services/profil";

export async function POST(request) {
  try {
    const session = await auth();

    if (session?.user?.email) {
      const blocked = await checkRateLimit(limiters.ai, session.user.email);
      if (blocked) return blocked;
    } else {
      const blocked = await checkRateLimit(guestLimiters.ai, `ip:${getClientIp(request)}`);
      if (blocked) return blocked;
    }

    const body = await request.json();
    const entreprise = sanitize(body.entreprise, 200);
    const poste = sanitize(body.poste, 200);
    const offre = sanitize(body.offre, 5000);
    const ton = ["professionnel", "dynamique", "concis"].includes(body.ton) ? body.ton : "professionnel";
    if (!entreprise || !poste) return badRequest("Entreprise et poste requis");

    let profil = null;
    if (session?.user?.email) {
      profil = await getProfil(session.user.email);
    }

    const profilTexte = profil?.cv
      ? `${profil.nom || session?.user?.name || ""}\n${profil.poste ? "Poste recherché : " + profil.poste : ""}\n${profil.ville ? "Ville : " + profil.ville : ""}\n\nCV :\n${profil.cv}`
      : session?.user?.name
        ? `Candidat : ${session.user.name} (CV non renseigné)`
        : "Profil non renseigné.";

    const prompt = `Tu es expert en recrutement. Rédige une lettre de motivation en français.

PROFIL : ${profilTexte}
POSTE : ${poste} chez ${entreprise}
${offre ? `OFFRE : ${offre}` : ""}
TON : ${ton}

Rédige une lettre courte et percutante (~250 mots). Pas de formules bateau. Commence directement par le corps de la lettre sans entête postal. Termine par une formule de politesse. Réponds uniquement avec le texte de la lettre, sans commentaire.`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const lettre = completion.choices[0]?.message?.content ?? "";
    return Response.json({ lettre });
  } catch (error) {
    const msg = error?.message ?? "";
    if (msg.includes("429") || msg.includes("rate_limit") || msg.includes("quota")) {
      return Response.json({ error: "Quota IA épuisé, réessaie dans quelques minutes." });
    }
    return Response.json({ error: "Erreur lors de la génération." }, { status: 500 });
  }
}
