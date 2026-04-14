import { auth } from "@/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) return Response.json({ error: "Aucun fichier" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "application/pdf",
          data: base64,
        },
      },
      "Extrais tout le texte de ce CV exactement tel quel, sans résumé ni reformulation. Garde la structure originale.",
    ]);

    const text = result.response.text().trim();
    return Response.json({ text });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
