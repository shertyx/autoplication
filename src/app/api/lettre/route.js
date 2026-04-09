import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const FELIX_PROFILE = `Félix Caron, 25 ans, Data Analyst / Ingénieur IA basé à Lille.
Formation : Master Data & IA (Université Catholique de Lille, 2023-2025), Licence Informatique Générale, BTS SIO.
Expérience : Développeur Data Junior chez CGI (2023-2025) — BigQuery, React, Unity 3D, Tibco, XML, JSON, API.
Projet WasteNet : modèle CNN PyTorch de classification d'images de déchets.
Compétences : Python, SQL, React, JavaScript, Java, HTML/CSS, BigQuery, NumPy, Power BI, Tableau, Git, API REST.
Langues : Français natif, Anglais B2.`;

export async function POST(request) {
  try {
    const { entreprise, poste, offre, ton } = await request.json();
    const genAI2 = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI2.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Tu es expert en recrutement tech. Rédige une lettre de motivation en français.

PROFIL : ${FELIX_PROFILE}
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