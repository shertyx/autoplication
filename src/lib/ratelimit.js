import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Différentes fenêtres selon la sensibilité
export const limiters = {
  // Routes IA coûteuses
  ai: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 h"), prefix: "rl:ai" }),
  // Scraping
  scraper: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "1 h"), prefix: "rl:scraper" }),
  // Chat
  chat: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, "1 m"), prefix: "rl:chat" }),
  // Invitations / demandes d'ami / réponses / suppression compte
  social: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "1 h"), prefix: "rl:social" }),
  // Parse PDF
  parse: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 h"), prefix: "rl:parse" }),
  // Écritures profil / candidatures
  write: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "1 h"), prefix: "rl:write" }),
  // Polling notifications (toutes les 30s = ~120/h, on accepte 240)
  notifications: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(240, "1 h"), prefix: "rl:notif" }),
  // Recherche utilisateurs
  search: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, "1 h"), prefix: "rl:search" }),
  // Enregistrement au registre (appelé à chaque session)
  register: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "1 h"), prefix: "rl:register" }),
};

// Guest limiters — ~1/3 of authenticated limits, keyed by IP
export const guestLimiters = {
  ai:      new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3,  "1 h"), prefix: "rl:guest:ai" }),
  scraper: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5,  "1 h"), prefix: "rl:guest:scraper" }),
  parse:   new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3,  "1 h"), prefix: "rl:guest:parse" }),
};

export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export async function checkRateLimit(limiter, identifier) {
  const { success, remaining } = await limiter.limit(identifier);
  if (!success) {
    return Response.json(
      { error: "Trop de requêtes, réessaie dans quelques minutes." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }
  return null; // null = pas bloqué
}
