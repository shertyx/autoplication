import { GoogleGenerativeAI } from "@google/generative-ai";

const FELIX_PROFILE = `Félix Caron, 25 ans, Data Analyst / Ingénieur IA basé à Lille.
Formation : Master Data & IA (Université Catholique de Lille, 2023-2025), Licence Informatique Générale, BTS SIO.
Expérience : Développeur Data Junior chez CGI (2023-2025) — BigQuery, React, Unity 3D, Tibco, XML, JSON, API.
Projet WasteNet : modèle CNN PyTorch de classification d'images de déchets.
Compétences : Python, SQL, React, JavaScript, Java, HTML/CSS, BigQuery, NumPy, Power BI, Tableau, Git, API REST.
Langues : Français natif, Anglais B2.`;

export async function POST(request) {
  console.log("CLÉ GEMINI:", process.env.GEMINI_API_KEY);
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const { titre, entreprise } = await request.json();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Tu es un expert RH. Donne un score de compatibilité entre ce profil et ce poste.

PROFIL : ${FELIX_PROFILE}
POSTE : ${titre} chez ${entreprise}

Réponds UNIQUEMENT en JSON valide sans markdown :
{"score": 75, "raison": "Une phrase courte expliquant le score."}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    const data = JSON.parse(text);
    return Response.json(data);
} catch (error) {
  if (error.message?.includes("429")) {
    return Response.json({ score: null, raison: "quota_epuise" }, { status: 200 });
  }
  console.error("SCORE ERROR:", error.message);
  return Response.json({ score: 0, raison: "Erreur" }, { status: 500 });
}
}
