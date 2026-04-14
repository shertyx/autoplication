import { Redis } from "@upstash/redis";
import { auth } from "@/auth";
import { limiters, checkRateLimit } from "@/lib/ratelimit";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const DEFAULT_KEYWORDS = ["data analyst", "ingenieur IA", "data engineer", "machine learning"];
const DEFAULT_LOCATION = "Lille, France";

function getKeywordsFromProfile(profil) {
  if (!profil?.poste) return DEFAULT_KEYWORDS;
  const poste = profil.poste.trim();
  return [poste, poste + " junior", poste + " senior"];
}

function getLocationFromProfile(profil) {
  if (!profil?.ville) return DEFAULT_LOCATION;
  return profil.ville + ", France";
}

async function getTokenFT() {
  const res = await fetch(
    "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.FRANCE_TRAVAIL_CLIENT_ID,
        client_secret: process.env.FRANCE_TRAVAIL_CLIENT_SECRET,
        scope: "api_offresdemploiv2 o2dsoffre",
      }),
    }
  );
  const data = await res.json();
  if (!data.access_token) console.error("[FT] Échec token:", JSON.stringify(data));
  else console.log("[FT] Token OK");
  return data.access_token;
}

async function scrapeFranceTravail(token, keywords) {
  if (!token) {
    console.error("[FT] Token manquant, skip.");
    return [];
  }
  const offres = [];
  for (const keyword of keywords) {
    try {
      const res = await fetch(
        `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?motsCles=${encodeURIComponent(keyword)}&commune=59350&distance=30&nbResultats=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const text = await res.text();
      if (!text) { console.log(`[FT] "${keyword}": réponse vide (status ${res.status})`); continue; }
      const data = JSON.parse(text);
      console.log(`[FT] "${keyword}": status=${res.status}, resultats=${data.resultats?.length ?? 0}`, data.message ?? "");
      for (const o of data.resultats || []) {
        offres.push({
          id: `ft-${o.id}`,
          titre: o.intitule ?? "N/A",
          entreprise: o.entreprise?.nom ?? "Non précisé",
          lieu: o.lieuTravail?.libelle ?? "N/A",
          contrat: o.typeContratLibelle ?? "N/A",
          source: "France Travail",
          keyword,
          lien: o.origineOffre?.urlOrigine ?? `https://www.google.com/search?q=${encodeURIComponent((o.intitule ?? keyword) + " " + (o.entreprise?.nom ?? "") + " emploi")}`,
          date: new Date().toLocaleDateString("fr-FR"),
        });
      }
    } catch (e) {
      console.error(`[FT] Erreur "${keyword}":`, e.message);
    }
  }
  return offres;
}

async function scrapeGoogleJobs(keywords, location) {
  const offres = [];
  for (const keyword of keywords.slice(0, 2)) {
    try {
      const res = await fetch(
        `https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(keyword + " " + location)}&hl=fr&api_key=${process.env.SERP_API_KEY}`
      );
      const data = await res.json();
      for (const o of data.jobs_results || []) {
        offres.push({
          id: `gj-${o.job_id ?? Math.random()}`,
          titre: o.title ?? "N/A",
          entreprise: o.company_name ?? "N/A",
          lieu: o.location ?? location,
          contrat: o.detected_extensions?.schedule_type ?? "N/A",
          source: "Google Jobs",
          keyword,
          lien: o.apply_options?.[0]?.link ?? o.related_links?.[0]?.link ?? `https://www.google.com/search?q=${encodeURIComponent((o.title ?? keyword) + " " + (o.company_name ?? "") + " emploi")}`,
          date: new Date().toLocaleDateString("fr-FR"),
        });
      }
    } catch (e) {
      console.error(`[GJ] Erreur "${keyword}":`, e.message);
    }
  }
  return offres;
}

async function scrapeJSearch(keywords, location) {
  if (!process.env.JSEARCH_API_KEY) {
    console.log("[JS] Clé JSEARCH_API_KEY manquante, skip.");
    return [];
  }
  // Extraire juste le pays (ex: "Lille, France" → "France")
  const country = location.includes(",") ? location.split(",").pop().trim() : location;
  const offres = [];
  for (const keyword of keywords.slice(0, 2)) {
    try {
      const query = encodeURIComponent(`${keyword} in ${country}`);
      const url = `https://jsearch.p.rapidapi.com/search?query=${query}&page=1&num_pages=1`;
      const res = await fetch(url, {
        headers: {
          "X-RapidAPI-Key": process.env.JSEARCH_API_KEY,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
      });
      const rawText = await res.text();
      let data;
      try { data = JSON.parse(rawText); } catch {
        console.error(`[JS] "${keyword}": réponse non-JSON:`, rawText.slice(0, 200));
        continue;
      }
      if (data.status !== "OK") {
        console.error(`[JS] "${keyword}": status=${data.status} message=${data.message ?? JSON.stringify(data).slice(0, 150)}`);
        continue;
      }
      console.log(`[JS] "${keyword}": ${data.data?.length ?? 0} résultats (http ${res.status})`);
      for (const o of data.data || []) {
        offres.push({
          id: `js-${o.job_id ?? Math.random()}`,
          titre: o.job_title ?? "N/A",
          entreprise: o.employer_name ?? "N/A",
          lieu: [o.job_city, o.job_country].filter(Boolean).join(", ") || location,
          contrat: o.job_employment_type ?? "N/A",
          source: "JSearch",
          keyword,
          lien: o.job_apply_link ?? o.job_google_link ?? `https://www.google.com/search?q=${encodeURIComponent((o.job_title ?? keyword) + " " + (o.employer_name ?? "") + " emploi")}`,
          date: o.job_posted_at_datetime_utc
            ? new Date(o.job_posted_at_datetime_utc).toLocaleDateString("fr-FR")
            : new Date().toLocaleDateString("fr-FR"),
        });
      }
    } catch (e) {
      console.error(`[JS] Erreur "${keyword}":`, e.message);
    }
  }
  return offres;
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ success: false, error: "Non autorisé" }, { status: 401 });

  const blocked = await checkRateLimit(limiters.scraper, session.user.email);
  if (blocked) return blocked;

  try {
    const profil = await redis.get(`profil:${session.user.email}`);
    const keywords = getKeywordsFromProfile(profil);
    const location = getLocationFromProfile(profil);

    console.log(`[SCRAPER] User: ${session.user.email} | Keywords: ${keywords.join(", ")} | Location: ${location}`);

    const token = await getTokenFT();
    const [ftOffres, gjOffres, jsOffres] = await Promise.all([
      scrapeFranceTravail(token, keywords),
      scrapeGoogleJobs(keywords, location),
      scrapeJSearch(keywords, location),
    ]);

    console.log(`[SCRAPER] FT=${ftOffres.length} GJ=${gjOffres.length} JS=${jsOffres.length}`);
    const all = [...ftOffres, ...gjOffres, ...jsOffres];
    const seen = new Set();
    const unique = all.filter((o) => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });

    const payload = {
      last_update: new Date().toLocaleString("fr-FR"),
      total: unique.length,
      offres: unique,
    };

    await redis.set(`offres:${session.user.email}`, JSON.stringify(payload));

    return Response.json({ success: true, total: unique.length });
  } catch (error) {
    return Response.json({ success: false, error: "Erreur lors du scraping." }, { status: 500 });
  }
}
