"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";

const SOURCE_COLORS = {
  "France Travail": { color: "#58a6ff", bg: "rgba(88, 166, 255, 0.1)" },
  "Google Jobs":    { color: "#3fb950", bg: "rgba(63, 185, 80, 0.1)" },
  "JSearch":        { color: "#bc8cff", bg: "rgba(188, 140, 255, 0.1)" },
  "Indeed":         { color: "#d29922", bg: "rgba(210, 153, 34, 0.1)" },
};

export default function Offres() {
  const router = useRouter();
  const { candidatures, corbeille, postuler, mettreEnAttente, restaurerDansOffres, viderCorbeille, mettreEnCorbeille } = useApp();
  const [offres, setOffres] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [scores, setScores] = useState({});
  const [loadingScores, setLoadingScores] = useState({});
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState(null);
  const [quota, setQuota] = useState(null);
  const [filtre, setFiltre] = useState("toutes");
  const [sourceFiltre, setSourceFiltre] = useState("toutes");
  const [recherche, setRecherche] = useState("");

  const candidatureIds = new Set(candidatures.map((c) => c.id));
  const corbeilleIds = new Set((corbeille || []).map((c) => c.id));

  useEffect(() => { fetchOffres(); fetchQuota(); }, []);

  async function fetchQuota() {
    try {
      const res = await fetch("/api/quota");
      const data = await res.json();
      setQuota(data);
    } catch {}
  }

  async function fetchOffres() {
    const res = await fetch("/api/offres");
    const data = await res.json();
    setOffres(data.offres || []);
    setLastUpdate(data.last_update);
  }

  async function analyserOffres(liste) {
    for (const offre of liste.slice(0, 10)) {
      setLoadingScores((prev) => ({ ...prev, [offre.id]: true }));
      try {
        const res = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ titre: offre.titre, entreprise: offre.entreprise }),
        });
        const data = await res.json();
        if (data.raison === "quota_epuise") {
          setScores((prev) => ({ ...prev, [offre.id]: data }));
          setLoadingScores((prev) => ({ ...prev, [offre.id]: false }));
          break;
        }
        setScores((prev) => ({ ...prev, [offre.id]: data }));
      } catch {
        setScores((prev) => ({ ...prev, [offre.id]: { score: 0, raison: "Erreur" } }));
      } finally {
        setLoadingScores((prev) => ({ ...prev, [offre.id]: false }));
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  async function lancerScraper() {
    setScraping(true);
    setScrapeMsg(null);
    try {
      const res = await fetch("/api/scraper", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setScrapeMsg("Scraping terminé !");
        await fetchOffres();
      } else {
        setScrapeMsg("Erreur : " + data.error);
      }
    } catch {
      setScrapeMsg("Erreur lors du scraping");
    } finally {
      setScraping(false);
    }
  }

  function scoreColor(score) {
    if (score >= 75) return { color: "#3fb950", bg: "rgba(63,185,80,0.1)" };
    if (score >= 50) return { color: "#d29922", bg: "rgba(210,153,34,0.1)" };
    return { color: "#f85149", bg: "rgba(248,81,73,0.1)" };
  }

  const sourcesDisponibles = [...new Set(offres.map((o) => o.source).filter(Boolean))];

  const offresFiltrees = (filtre === "corbeille"
    ? (corbeille || [])
    : offres.filter((o) => {
        if (corbeilleIds.has(o.id)) return false;
        if (filtre === "masquees") return candidatureIds.has(o.id);
        if (filtre === "toutes") return !candidatureIds.has(o.id);
        if (filtre === "top") return !candidatureIds.has(o.id) && (scores[o.id]?.score ?? 0) >= 75;
        return true;
      })
  ).filter((o) =>
    (sourceFiltre === "toutes" || o.source === sourceFiltre) &&
    (recherche === "" ||
      o.titre?.toLowerCase().includes(recherche.toLowerCase()) ||
      o.entreprise?.toLowerCase().includes(recherche.toLowerCase()))
  );

  const filtres = [
    { key: "toutes", label: "Toutes" },
    { key: "top", label: "Top matchs" },
    { key: "masquees", label: "Suivies" },
    { key: "corbeille", label: `Corbeille (${(corbeille || []).length})` },
  ];

  return (
    <main style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 16px" }}>
      <div className="animate-in mobile-stack" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>Offres</h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            {offres.length} offres · Mise à jour : {lastUpdate ?? "jamais"}
          </p>
        </div>
        <div className="mobile-wrap" style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => analyserOffres(offres)}
            style={{
              fontSize: "13px", padding: "6px 14px",
              background: "transparent", border: "1px solid var(--border)",
              borderRadius: "6px", color: "var(--text-secondary)", cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            Analyser les matchs
          </button>
          <button
            onClick={lancerScraper}
            disabled={scraping}
            style={{
              fontSize: "13px", padding: "6px 14px",
              background: scraping ? "var(--bg-tertiary)" : "#238636",
              border: "1px solid " + (scraping ? "var(--border)" : "#2ea043"),
              borderRadius: "6px", color: scraping ? "var(--text-muted)" : "#fff",
              cursor: scraping ? "not-allowed" : "pointer", transition: "all 0.15s",
            }}
          >
            {scraping ? "Scraping..." : "Actualiser"}
          </button>
        </div>
      </div>

      {quota && (
        <div className="animate-in mobile-wrap" style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          {[
            { label: "SerpAPI", data: quota.serpapi, color: "#3fb950" },
            { label: "JSearch", data: quota.jsearch, color: "#bc8cff" },
            { label: "Gemini", data: quota.gemini, color: "#58a6ff" },
          ].map(({ label, data, color }) => {
            if (!data) return null;
            const pct = data.limit ? Math.round((data.remaining ?? 0) / data.limit * 100) : null;
            const low = pct !== null && pct < 20;
            const displayColor = low ? "#f85149" : color;
            return (
              <div key={label} style={{
                fontSize: "11px", padding: "4px 10px",
                background: "var(--bg-secondary)", border: `1px solid ${low ? "rgba(248,81,73,0.3)" : "var(--border)"}`,
                borderRadius: "20px", color: "var(--text-muted)",
                display: "flex", alignItems: "center", gap: "6px",
              }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: displayColor, display: "inline-block" }} />
                <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
                {data.remaining != null && (
                  <span style={{ color: displayColor }}>
                    {label === "Gemini" ? `${data.used} appels` : `${data.remaining}${data.limit ? `/${data.limit}` : ""} restants`}
                  </span>
                )}
                {data.remaining == null && data.used != null && (
                  <span style={{ color: displayColor }}>{data.used} appels</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {scrapeMsg && (
        <div className="animate-in" style={{
          marginBottom: "16px", padding: "10px 16px",
          background: "rgba(63,185,80,0.1)", border: "1px solid rgba(63,185,80,0.3)",
          borderRadius: "6px", fontSize: "13px", color: "#3fb950",
        }}>
          {scrapeMsg}
        </div>
      )}

      <input
        type="text"
        placeholder="Rechercher une offre, entreprise..."
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        style={{ width: "100%", marginBottom: "12px" }}
      />

      <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
        {filtres.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltre(f.key)}
            style={{
              fontSize: "12px", padding: "5px 12px",
              background: filtre === f.key ? "var(--bg-tertiary)" : "transparent",
              border: "1px solid " + (filtre === f.key ? "var(--accent)" : "var(--border)"),
              borderRadius: "6px",
              color: filtre === f.key ? "var(--accent)" : "var(--text-secondary)",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {f.label}
          </button>
        ))}
        {filtre === "corbeille" && (corbeille || []).length > 0 && (
          <button
            onClick={viderCorbeille}
            style={{
              fontSize: "12px", padding: "5px 12px",
              background: "transparent", border: "1px solid rgba(248,81,73,0.3)",
              borderRadius: "6px", color: "var(--danger)", cursor: "pointer",
              marginLeft: "auto",
            }}
          >
            Vider
          </button>
        )}
      </div>

      {sourcesDisponibles.length > 1 && (
        <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
          <button
            onClick={() => setSourceFiltre("toutes")}
            style={{
              fontSize: "11px", padding: "3px 10px",
              background: sourceFiltre === "toutes" ? "var(--bg-tertiary)" : "transparent",
              border: "1px solid " + (sourceFiltre === "toutes" ? "var(--border)" : "var(--border)"),
              borderRadius: "20px",
              color: sourceFiltre === "toutes" ? "var(--text-primary)" : "var(--text-muted)",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            Toutes les sources
          </button>
          {sourcesDisponibles.map((src) => {
            const s = SOURCE_COLORS[src] ?? { color: "#8b949e", bg: "rgba(139,148,158,0.1)" };
            const count = offres.filter((o) => o.source === src).length;
            return (
              <button
                key={src}
                onClick={() => setSourceFiltre(src)}
                style={{
                  fontSize: "11px", padding: "3px 10px",
                  background: sourceFiltre === src ? s.bg : "transparent",
                  border: "1px solid " + (sourceFiltre === src ? s.color : "var(--border)"),
                  borderRadius: "20px",
                  color: sourceFiltre === src ? s.color : "var(--text-muted)",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {src} · {count}
              </button>
            );
          })}
        </div>
      )}

      {offresFiltrees.length === 0 ? (
        <div style={{
          background: "var(--bg-secondary)", border: "1px solid var(--border)",
          borderRadius: "8px", padding: "48px", textAlign: "center",
        }}>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            {filtre === "corbeille" ? "La corbeille est vide." : "Aucune offre dans cette catégorie."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {offresFiltrees.map((offre, i) => {
            const score = scores[offre.id];
            const loading = loadingScores[offre.id];
            const dejaPostule = candidatureIds.has(offre.id);
            const src = SOURCE_COLORS[offre.source] ?? { color: "#8b949e", bg: "rgba(139,148,158,0.1)" };
            const sc = score && score.score != null ? scoreColor(score.score) : null;

            return (
              <div key={offre.id} className="animate-in mobile-stack" style={{
                animationDelay: `${Math.min(i * 30, 300)}ms`,
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "8px", padding: "14px 16px",
                display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "#444c56"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: "11px", padding: "2px 8px", borderRadius: "20px",
                      color: src.color, background: src.bg, fontWeight: 500,
                    }}>
                      {offre.source}
                    </span>
                    {offre.contrat && offre.contrat !== "N/A" && (
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{offre.contrat}</span>
                    )}
                    {loading ? (
                      <span className="animate-pulse" style={{ fontSize: "11px", color: "var(--text-muted)" }}>Analyse...</span>
                    ) : score?.raison === "quota_epuise" ? (
                      <span style={{ fontSize: "11px", color: "#d29922", background: "rgba(210,153,34,0.1)", padding: "2px 8px", borderRadius: "20px" }}>
                        Quota épuisé
                      </span>
                    ) : sc ? (
                      <span style={{
                        fontSize: "11px", padding: "2px 8px", borderRadius: "20px",
                        color: sc.color, background: sc.bg, fontWeight: 500,
                      }}>
                        {score.score}% match
                      </span>
                    ) : null}
                  </div>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)", marginBottom: "3px" }}>
                    {offre.titre}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {offre.entreprise} · {offre.lieu}
                  </p>
                  {score?.raison && !["quota_epuise", "Erreur"].includes(score.raison) && (
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px", fontStyle: "italic" }}>
                      {score.raison}
                    </p>
                  )}
                </div>

                <div className="mobile-wrap mobile-full" style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
                  {filtre === "corbeille" ? (
                    <button onClick={() => restaurerDansOffres(offre.id)} style={btnStyle("#238636", "#2ea043", "#fff")}>
                      Restaurer
                    </button>
                  ) : dejaPostule ? (
                    <>
                      <span style={{
                        fontSize: "12px", padding: "5px 12px", borderRadius: "6px",
                        background: "rgba(63,185,80,0.1)", color: "#3fb950", textAlign: "center",
                      }}>
                        Suivie ✓
                      </span>
                      <button onClick={() => router.push(`/lettre?titre=${encodeURIComponent(offre.titre)}&entreprise=${encodeURIComponent(offre.entreprise)}`)} style={btnStyle("transparent", "var(--border)", "var(--text-secondary)")}>
                        Lettre
                      </button>
                      <button onClick={() => mettreEnCorbeille(offre)} style={btnStyle("transparent", "rgba(248,81,73,0.3)", "var(--danger)")}>
                        Corbeille
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => postuler(offre)} style={btnStyle("#238636", "#2ea043", "#fff")}>
                        Postuler
                      </button>
                      <button onClick={() => mettreEnAttente(offre)} style={btnStyle("transparent", "var(--border)", "var(--text-secondary)")}>
                        En attente
                      </button>
                      <button onClick={() => router.push(`/lettre?titre=${encodeURIComponent(offre.titre)}&entreprise=${encodeURIComponent(offre.entreprise)}`)} style={btnStyle("transparent", "var(--border)", "var(--accent)")}>
                        Lettre
                      </button>
                      <button onClick={() => mettreEnCorbeille(offre)} style={btnStyle("transparent", "rgba(248,81,73,0.3)", "var(--danger)")}>
                        Corbeille
                      </button>
                    </>
                  )}
                  {offre.lien && offre.lien !== "#" && (
                    <a href={offre.lien} target="_blank" rel="noopener noreferrer" style={{
                      ...btnStyle("transparent", "var(--border)", "var(--text-secondary)"),
                      textDecoration: "none", textAlign: "center",
                    }}>
                      Voir →
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function btnStyle(bg, border, color) {
  return {
    fontSize: "12px", padding: "5px 12px",
    background: bg, border: `1px solid ${border}`,
    borderRadius: "6px", color, cursor: "pointer",
    transition: "all 0.15s", whiteSpace: "nowrap",
  };
}
