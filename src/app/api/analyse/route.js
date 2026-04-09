import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const FELIX_PROFILE = `Félix Caron, 25 ans, Data Analyst / Ingénieur IA basé à Lille.
Formation : Master Data & IA (Université Catholique de Lille, 2023-2025), Licence Informatique Générale, BTS SIO.
Expérience : Développeur Data Junior chez CGI (2023-2025) — BigQuery, React, Unity 3D, Tibco, XML, JSON, API.
Stage Verspieren : automatisation Office 365. Stage Alliance Technique : développement web.
Projet WasteNet : modèle CNN PyTorch de classification d'images de déchets.
Compétences : Python, SQL, React, JavaScript, Java, HTML/CSS, BigQuery, NumPy, Power BI, Tableau, Git, API REST.
Langues : Français natif, Anglais B2.`;

export async function POST(request) {
  try {
    const { offre } = await request.json();

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Tu es un expert RH. Analyse la compatibilité entre ce profil et cette offre.

PROFIL :
${FELIX_PROFILE}

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
    return Response.json({ error: error.message }, { status: 500 });
  }
}