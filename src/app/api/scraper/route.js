import { Redis } from "@upstash/redis";
import { auth } from "@/auth";
import { limiters, guestLimiters, checkRateLimit, getClientIp } from "@/lib/ratelimit";
import Groq from "groq-sdk";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const DEFAULT_KEYWORDS = ["data analyst", "data engineer", "machine learning engineer", "AI engineer"];
const DEFAULT_LOCATION = "Paris, France";

function simpleKeywordFallback(poste) {
  const base = poste.trim();
  const stripped = base.replace(/\b(junior|senior|lead|chief|head|stagiaire|alternance|apprenti)\b/gi, "").replace(/\s+/g, " ").trim();
  return [...new Set([base, stripped, stripped + " junior", stripped + " senior", stripped + " manager"])].filter(Boolean).slice(0, 5);
}

function fallbackKeywords(poste) {
  const base = poste.trim();
  const stripped = base.replace(/\b(junior|senior|lead|chief|head|stagiaire|alternance|apprenti)\b/gi, "").replace(/\s+/g, " ").trim();
  const keywords = new Set([base, stripped].filter(Boolean));
  const translations = {
    // Data
    "data analyst":       ["Data Analyst", "Business Analyst", "BI Analyst", "Data Scientist"],
    "data scientist":     ["Data Scientist", "ML Engineer", "Data Analyst", "Research Scientist"],
    "data engineer":      ["Data Engineer", "Big Data Engineer", "ETL Developer", "Data Architect"],
    "data manager":       ["Data Manager", "Data Analyst", "Data Governance", "Chief Data Officer"],
    // IA / ML
    "machine learning":   ["Machine Learning Engineer", "ML Engineer", "AI Engineer", "Data Scientist"],
    "ingénieur ia":       ["AI Engineer", "Machine Learning Engineer", "Deep Learning Engineer"],
    "intelligence artificielle": ["AI Engineer", "Machine Learning Engineer", "Data Scientist"],
    // Dev
    "développeur web":    ["Web Developer", "Frontend Developer", "Full Stack Developer", "Software Engineer"],
    "développeur full":   ["Full Stack Developer", "Software Engineer", "Web Developer"],
    "développeur front":  ["Frontend Developer", "React Developer", "UI Developer", "Frontend Engineer"],
    "développeur back":   ["Backend Developer", "Software Engineer", "Node.js Developer", "API Developer"],
    "développeur":        ["Software Developer", "Software Engineer", "Developer", "Programmer"],
    "ingénieur logiciel": ["Software Engineer", "Software Developer", "Backend Engineer"],
    "ingénieur":          ["Software Engineer", "Engineer", "Developer", "Tech Lead"],
    // Cloud / DevOps
    "devops":             ["DevOps Engineer", "SRE", "Platform Engineer", "Cloud Engineer"],
    "cloud":              ["Cloud Engineer", "AWS Engineer", "Azure Engineer", "DevOps Engineer"],
    "sre":                ["SRE", "DevOps Engineer", "Platform Engineer", "Infrastructure Engineer"],
    // Cyber
    "cybersécurité":      ["Cybersecurity Engineer", "Security Analyst", "Pentester", "SOC Analyst"],
    "sécurité":           ["Security Engineer", "Cybersecurity Analyst", "SOC Analyst"],
    // Product / Management
    "product manager":    ["Product Manager", "Product Owner", "Chef de produit", "PO"],
    "product owner":      ["Product Owner", "Product Manager", "Scrum Master", "Agile Coach"],
    "chef de projet":     ["Project Manager", "Chef de projet", "Program Manager", "Scrum Master"],
    "scrum master":       ["Scrum Master", "Agile Coach", "Product Owner", "Project Manager"],
    // Marketing
    "marketing digital":  ["Digital Marketing Manager", "Marketing Manager", "Growth Hacker", "SEO Manager"],
    "marketing":          ["Marketing Manager", "Marketing Specialist", "Brand Manager", "Growth Manager"],
    "seo":                ["SEO Manager", "SEO Specialist", "Digital Marketing", "Content Manager"],
    "community manager":  ["Community Manager", "Social Media Manager", "Content Creator"],
    // Design
    "ux":                 ["UX Designer", "Product Designer", "UI/UX Designer", "UX Researcher"],
    "ui designer":        ["UI Designer", "Product Designer", "Frontend Developer", "Graphic Designer"],
    "graphiste":          ["Graphic Designer", "Visual Designer", "UI Designer", "Creative Designer"],
    // Finance / Compta
    "comptable":          ["Comptable", "Accountant", "Financial Analyst", "Contrôleur de gestion"],
    "finance":            ["Financial Analyst", "Finance Manager", "Contrôleur de gestion", "CFO"],
    "contrôleur":         ["Contrôleur de gestion", "Financial Controller", "Business Controller"],
    // RH
    "ressources humaines": ["HR Manager", "RH", "Talent Acquisition", "Recruiter"],
    "recrutement":        ["Recruiter", "Talent Acquisition", "HR Manager", "Sourcer"],
    // Commercial / Ventes
    "commercial":         ["Sales Manager", "Business Developer", "Account Manager", "Commercial"],
    "business developer": ["Business Developer", "Sales Manager", "Account Executive", "BDR"],
    "account manager":    ["Account Manager", "Customer Success", "Sales Manager", "KAM"],
  };

  const lower = stripped.toLowerCase();
  let matched = false;
  for (const [key, vals] of Object.entries(translations)) {
    if (lower.includes(key)) {
      vals.forEach((v) => keywords.add(v));
      matched = true;
      break;
    }
  }

  // Fallback générique : variantes avec niveaux si pas de mapping
  if (!matched) {
    keywords.add(stripped + " junior");
    keywords.add(stripped + " senior");
    keywords.add(stripped + " manager");
  }

  const result = [...keywords].slice(0, 5);
  console.log(`[KEYWORDS] Fallback: ${result.join(", ")}`);
  return result;
}

async function generateKeywords(profil, userEmail) {
  if (!profil?.poste) return DEFAULT_KEYWORDS;

  // Cache Redis basé sur le poste — évite de rappeler Gemini à chaque scraping
  const cacheKey = `keywords:${userEmail}:${Buffer.from(profil.poste).toString("base64").slice(0, 20)}`;
  const cached = await redis.get(cacheKey);
  if (Array.isArray(cached) && cached.length > 0) {
    console.log(`[KEYWORDS] Cache: ${cached.join(", ")}`);
    return cached;
  }

  // Appel Groq (une seule fois, puis mis en cache 7 jours)
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const prompt = `Tu es un expert RH. Génère 5 intitulés de poste variés (français ET anglais) pour trouver un maximum d'offres d'emploi pour ce profil.
Poste : ${profil.poste}
${profil.cv ? `CV (extrait) : ${profil.cv.slice(0, 500)}` : ""}

Réponds UNIQUEMENT avec un tableau JSON de 5 strings, sans markdown. Ex: ["Data Analyst","Business Analyst","BI Analyst","Analyste de données","Data Scientist"]`;
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });
    const text = (completion.choices[0]?.message?.content ?? "").replace(/```json|```/g, "").trim();
    const keywords = JSON.parse(text);
    if (Array.isArray(keywords) && keywords.length > 0) {
      console.log(`[KEYWORDS] IA: ${keywords.join(", ")}`);
      await redis.set(cacheKey, keywords, { ex: 60 * 60 * 24 * 7 }); // cache 7 jours
      return keywords;
    }
  } catch (e) {
    console.error(`[KEYWORDS] Groq indisponible (${e.message?.slice(0, 60)}), fallback.`);
  }

  // Fallback si Gemini échoue : dictionnaire de synonymes
  return fallbackKeywords(profil.poste);
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

async function scrapeFranceTravail(token, keywords, location) {
  if (!token) {
    console.error("[FT] Token manquant, skip.");
    return [];
  }
  // Extraire la ville pour l'inclure dans les mots-clés si possible
  const ville = location.includes(",") ? location.split(",")[0].trim() : location;
  const offres = [];
  for (const keyword of keywords) {
    try {
      const res = await fetch(
        `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?motsCles=${encodeURIComponent(keyword + " " + ville)}&nbResultats=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Compteur journalier FT (TTL 24h pour reset automatique)
      const ftKey = "quota:francetravail:daily";
      await redis.incr(ftKey);
      await redis.expire(ftKey, 86400);
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
  if (!process.env.SERP_API_KEY) { console.log("[GJ] Clé SERP_API_KEY manquante, skip."); return []; }
  const offres = [];
  for (const keyword of keywords.slice(0, 3)) {
    try {
      const res = await fetch(
        `https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(keyword + " " + location)}&hl=fr&gl=fr&api_key=${process.env.SERP_API_KEY}`
      );
      const text = await res.text();
      console.log(`[GJ] "${keyword}": http=${res.status} body=${text.slice(0, 120)}`);
      if (!text) continue;
      let data;
      try { data = JSON.parse(text); } catch { console.error(`[GJ] JSON invalide pour "${keyword}"`); continue; }
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
  for (const keyword of keywords) {
    try {
      const query = encodeURIComponent(keyword);
      const url = `https://jsearch.p.rapidapi.com/search?query=${query}&page=1&num_pages=2`;
      const res = await fetch(url, {
        headers: {
          "X-RapidAPI-Key": process.env.JSEARCH_API_KEY,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
      });
      // Capturer le quota RapidAPI depuis les headers
      const remaining = res.headers.get("x-ratelimit-requests-remaining");
      const limit = res.headers.get("x-ratelimit-requests-limit");
      if (remaining !== null) {
        await redis.set("quota:jsearch", { remaining: parseInt(remaining), limit: parseInt(limit ?? 0) }, { ex: 86400 });
      }

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

export async function POST(request) {
  const session = await auth();

  if (session?.user?.email) {
    const blocked = await checkRateLimit(limiters.scraper, session.user.email);
    if (blocked) return blocked;
  } else {
    const blocked = await checkRateLimit(guestLimiters.scraper, `ip:${getClientIp(request)}`);
    if (blocked) return blocked;
  }

  try {
    const profil = session?.user?.email ? await redis.get(`profil:${session.user.email}`) : null;

    if (!profil?.poste?.trim() || !profil?.ville?.trim()) {
      return Response.json({ success: false, error: "Complète ton profil (poste + ville) avant de lancer le scraping." }, { status: 400 });
    }

    const userKey = session?.user?.email ?? `ip:${getClientIp(request)}`;
    const keywords = await generateKeywords(profil, userKey);
    const location = getLocationFromProfile(profil);

    console.log(`[SCRAPER] User: ${userKey} | Keywords: ${keywords.join(", ")} | Location: ${location}`);

    const token = await getTokenFT();
    const [ftOffres, gjOffres, jsOffres] = await Promise.all([
      scrapeFranceTravail(token, keywords, location),
      scrapeGoogleJobs(keywords, location),
      scrapeJSearch(keywords, location),
    ]);

    console.log(`[SCRAPER] FT=${ftOffres.length} GJ=${gjOffres.length} JS=${jsOffres.length}`);
    await redis.set("quota:francetravail", { count: ftOffres.length }, { ex: 60 * 60 * 24 });
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

    await redis.set(`offres:${userKey}`, JSON.stringify(payload));

    return Response.json({ success: true, total: unique.length });
  } catch (error) {
    return Response.json({ success: false, error: "Erreur lors du scraping." }, { status: 500 });
  }
}
