import { auth } from "@/auth";

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) return Response.json({ error: "Aucun fichier" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const result = await pdfParse(buffer);

    return Response.json({ text: result.text.trim() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
