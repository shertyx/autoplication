import { auth } from "@/auth";
import { getGuestKey } from "@/lib/ratelimit";
import { getOffres } from "@/services/offres";

export async function GET(request) {
  const session = await auth();
  const userKey = session?.user?.email ?? getGuestKey(request);

  try {
    const data = await getOffres(userKey);
    return Response.json(data);
  } catch {
    return Response.json({ last_update: null, total: 0, offres: [] });
  }
}
