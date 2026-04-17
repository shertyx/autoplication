"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getGuestId } from "@/lib/guestId";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";

const ADMIN_EMAIL = "fcaron59126@gmail.com";

const SOURCE_COLORS = {
  "France Travail": { color: "#58a6ff", bg: "rgba(88, 166, 255, 0.1)" },
  "Google Jobs":    { color: "#3fb950", bg: "rgba(63, 185, 80, 0.1)" },
  "JSearch":        { color: "#bc8cff", bg: "rgba(188, 140, 255, 0.1)" },
  "Indeed":         { color: "#d29922", bg: "rgba(210, 153, 34, 0.1)" },
};

export default function Offres() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.email === ADMIN_EMAIL;
  const { candidatures, corbeille, postuler, mettreEnAttente, restaurerDansOffres, viderCorbeille, mettreEnCorbeille, analyses, removeAnalyse } = useApp();
  const [offres, setOffres] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState(null);
  const [quota, setQuota] = useState(null);
  const [resetMsg, setResetMsg] = useState(null);
  const [filtre, setFiltre] = useState("toutes");
  const [sourceFiltre, setSourceFiltre] = useState("toutes");
  const [recherche, setRecherche] = useState("");

  const candidatureIds = new Set(candidatures.map((c) => c.id));
  const corbeilleIds = new Set((corbeille || []).map((c) => c.id));

  useEffect(() => { fetchOffres(); fetchQuota(); }, []);

  async function mettreEnCorbeilleAvecVerif(offre) {
    if (analyses[offre.id]) {
      if (!confirm(`Cette offre a été analysée (${analyses[offre.id].score}% match). La mettre à la corbeille supprimera l'analyse. Continuer ?`)) return;
      await fetch(`/api/analyse/saved?id=${encodeURIComponent(offre.id)}`, { method: "DELETE" });
      removeAnalyse(offre.id);
    }
    mettreEnCorbeille(offre);
  }

  function ouvrirLettre(offre) {
    try {
      if (offre.description) sessionStorage.setItem("lettre_description", offre.description);
      else sessionStorage.removeItem("lettre_description");
    } catch {}
    router.push(`/lettre?titre=${encodeURIComponent(offre.titre)}&entreprise=${encodeURIComponent(offre.entreprise)}&id=${encodeURIComponent(offre.id)}&source=${encodeURIComponent(offre.source ?? "")}`);
  }

  function ouvrirAnalyse(offre) {
    try { sessionStorage.setItem("analyse_lien", offre.lien ?? ""); } catch {}
    if (analyses[offre.id]) {
      try { sessionStorage.setItem("analyse_resultat", JSON.stringify(analyses[offre.id])); } catch {}
    }
    router.push(`/analyse?titre=${encodeURIComponent(offre.titre)}&entreprise=${encodeURIComponent(offre.entreprise)}&id=${encodeURIComponent(offre.id)}&source=${encodeURIComponent(offre.source ?? "")}`);
  }

  async function fetchQuota() {
    try {
      const res = await fetch("/api/quota");
      const data = await res.json();
      setQuota(data);
    } catch {}
  }

  async function fetchOffres() {
    const res = await fetch("/api/offres", { headers: { "x-guest-id": getGuestId() } });
    const data = await res.json();
    setOffres(data.offres || []);
    setLastUpdate(data.last_update);
  }

  async function resetGeminiQuota() {
    setResetMsg("...");
    try {
      const res = await fetch("/api/admin/reset-quota", { method: "POST" });
      if (res.ok) {
        setResetMsg("Compteur remis à zéro !");
        await fetchQuota();
      } else {
        setResetMsg("Erreur " + res.status);
      }
    } catch {
      setResetMsg("Erreur réseau");
    }
    setTimeout(() => setResetMsg(null), 3000);
  }

  async function lancerScraper() {
    setScraping(true);
    setScrapeMsg(null);
    try {
      let guestProfil = null;
      if (!session?.user?.email) {
        try { guestProfil = JSON.parse(localStorage.getItem("applify_profil") || "{}"); } catch {}
      }
      const res = await fetch("/api/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(!session?.user?.email && { "x-guest-id": getGuestId() }) },
        body: JSON.stringify(guestProfil ? { guestProfil } : {}),
      });
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

  const sourcesDisponibles = [...new Set(offres.map((o) => o.source).filter(Boolean))];

  const offresFiltrees = (filtre === "corbeille"
    ? (corbeille || [])
    : offres.filter((o) => {
        if (corbeilleIds.has(o.id)) return false;
        if (filtre === "masquees") return candidatureIds.has(o.id);
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
            { label: "France Travail", data: quota.franceTravail, color: "#58a6ff", type: "quota" },
            { label: "SerpAPI",        data: quota.googleJobs,    color: "#3fb950", type: "quota" },
            { label: "JSearch",        data: quota.jsearch,       color: "#bc8cff", type: "quota" },
            { label: "Gemini",         data: quota.gemini,        color: "#d29922", type: "quota" },
          ].map(({ label, data, color, type }) => {
            if (!data) return null;
            const pct = type === "quota" && data.limit ? Math.round((data.remaining ?? 0) / data.limit * 100) : null;
            const low = pct !== null && pct < 20;
            const displayColor = low ? "#f85149" : color;
            const valueText = type === "quota"
              ? `${data.remaining ?? "?"}${data.limit ? `/${data.limit}` : ""} restants`
              : type === "offres"
                ? `${data.count ?? 0} offres trouvées`
                : `${data.used ?? 0} appels`;
            return (
              <div key={label} style={{
                fontSize: "11px", padding: "4px 10px",
                background: "var(--bg-secondary)", border: `1px solid ${low ? "rgba(248,81,73,0.3)" : "var(--border)"}`,
                borderRadius: "20px", color: "var(--text-muted)",
                display: "flex", alignItems: "center", gap: "6px",
              }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: displayColor, display: "inline-block" }} />
                <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
                <span style={{ color: displayColor }}>{valueText}</span>
                {isAdmin && label === "Gemini" && (
                  <button
                    onClick={resetGeminiQuota}
                    style={{
                      fontSize: "10px", padding: "1px 6px", marginLeft: "2px",
                      background: "transparent", border: "1px solid var(--border)",
                      borderRadius: "10px", color: "var(--text-muted)", cursor: "pointer",
                    }}
                    title="Réinitialiser le compteur Gemini"
                  >
                    reset
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {resetMsg && (
        <div style={{ fontSize: "11px", color: resetMsg.startsWith("Erreur") ? "var(--danger)" : "#3fb950", marginBottom: "8px" }}>
          {resetMsg}
        </div>
      )}

      {scrapeMsg && (
        <div className="animate-in" style={{
          marginBottom: "16px", padding: "10px 16px",
          background: scrapeMsg.startsWith("Erreur") ? "rgba(248,81,73,0.1)" : "rgba(63,185,80,0.1)",
          border: "1px solid " + (scrapeMsg.startsWith("Erreur") ? "rgba(248,81,73,0.3)" : "rgba(63,185,80,0.3)"),
          borderRadius: "6px", fontSize: "13px",
          color: scrapeMsg.startsWith("Erreur") ? "var(--danger)" : "#3fb950",
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
            const dejaPostule = candidatureIds.has(offre.id);
            const src = SOURCE_COLORS[offre.source] ?? { color: "#8b949e", bg: "rgba(139,148,158,0.1)" };
            const analyse = analyses[offre.id];
            const scoreColor = analyse ? (analyse.score >= 75 ? "#3fb950" : analyse.score >= 50 ? "#d29922" : "#f85149") : null;
            const scoreBg = analyse ? (analyse.score >= 75 ? "rgba(63,185,80,0.1)" : analyse.score >= 50 ? "rgba(210,153,34,0.1)" : "rgba(248,81,73,0.1)") : null;

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
                    {analyse && (
                      <button onClick={() => ouvrirAnalyse(offre)} style={{
                        fontSize: "11px", padding: "2px 8px", borderRadius: "20px",
                        color: scoreColor, background: scoreBg, border: `1px solid ${scoreColor}33`,
                        fontWeight: 500, cursor: "pointer",
                      }}>
                        {analyse.score}% match
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)", marginBottom: "3px" }}>
                    {offre.titre}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {offre.entreprise} · {offre.lieu}
                  </p>
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
                      <button onClick={() => ouvrirLettre(offre)} style={btnStyle("transparent", "var(--border)", "var(--text-secondary)")}>
                        Lettre
                      </button>
                      <button onClick={() => ouvrirAnalyse(offre)} style={btnStyle("transparent", "var(--border)", "var(--text-secondary)")}>
                        {analyse ? "Voir l'analyse" : "Analyser"}
                      </button>
                      <button onClick={() => mettreEnCorbeilleAvecVerif(offre)} style={btnStyle("transparent", "rgba(248,81,73,0.3)", "var(--danger)")}>
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
                      <button onClick={() => ouvrirLettre(offre)} style={btnStyle("transparent", "var(--border)", "var(--accent)")}>
                        Lettre
                      </button>
                      <button onClick={() => ouvrirAnalyse(offre)} style={btnStyle("transparent", "var(--border)", "var(--text-secondary)")}>
                        {analyse ? "Voir l'analyse" : "Analyser"}
                      </button>
                      <button onClick={() => mettreEnCorbeilleAvecVerif(offre)} style={btnStyle("transparent", "rgba(248,81,73,0.3)", "var(--danger)")}>
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
