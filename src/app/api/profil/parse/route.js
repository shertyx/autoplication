import { auth } from "@/auth";
import { limiters, checkRateLimit } from "@/lib/ratelimit";

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) return Response.json({ error: "Aucun fichier" }, { status: 400 });

    const blocked = await checkRateLimit(limiters.parse, session.user.email);
    if (blocked) return blocked;

    // Limite taille fichier à 5 Mo
    if (file.size > 5 * 1024 * 1024) return Response.json({ error: "Fichier trop volumineux (max 5 Mo)" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const result = await pdfParse(buffer);

    return Response.json({ text: result.text.trim() });
  } catch (error) {
    return Response.json({ error: "Impossible de lire le PDF." }, { status: 500 });
  }
}
