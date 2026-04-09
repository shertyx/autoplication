"use client";

import { useState } from "react";

export default function Analyse() {
  const [offre, setOffre] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState(null);

  async function analyser() {
    if (!offre.trim()) return;
    setLoading(true);
    setErreur(null);
    setResultat(null);
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offre }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResultat(data);
    } catch (e) {
      setErreur(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "32px 24px" }}>
      <div className="animate-in" style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
          Analyser une offre
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          Colle une fiche de poste et l'IA analyse ta compatibilité
        </p>
      </div>

      <div className="animate-in" style={{
        background: "var(--bg-secondary)", border: "1px solid var(--border)",
        borderRadius: "8px", padding: "20px", marginBottom: "16px",
      }}>
        <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Fiche de poste
        </label>
        <textarea
          value={offre}
          onChange={(e) => setOffre(e.target.value)}
          placeholder="Colle ici la description complète de l'offre d'emploi..."
          style={{ width: "100%", minHeight: "160px", resize: "vertical" }}
        />
        <button
          onClick={analyser}
          disabled={loading || !offre.trim()}
          style={{
            marginTop: "12px", fontSize: "13px", padding: "7px 18px",
            background: loading || !offre.trim() ? "var(--bg-tertiary)" : "#238636",
            border: "1px solid " + (loading || !offre.trim() ? "var(--border)" : "#2ea043"),
            borderRadius: "6px",
            color: loading || !offre.trim() ? "var(--text-muted)" : "#fff",
            cursor: loading || !offre.trim() ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {loading ? "Analyse en cours..." : "Analyser"}
        </button>
      </div>

      {erreur && (
        <div className="animate-in" style={{
          padding: "12px 16px", background: "rgba(248,81,73,0.1)",
          border: "1px solid rgba(248,81,73,0.3)", borderRadius: "6px",
          fontSize: "13px", color: "var(--danger)",
        }}>
          {erreur}
        </div>
      )}

      {resultat && (
        <div className="animate-in" style={{
          background: "var(--bg-secondary)", border: "1px solid var(--border)",
          borderRadius: "8px", padding: "20px",
        }}>
          <h2 style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)", marginBottom: "16px" }}>
            Résultat de l'analyse
          </h2>

          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Compatibilité</span>
              <span style={{ fontSize: "18px", fontWeight: 600, color: resultat.score >= 75 ? "#3fb950" : resultat.score >= 50 ? "#d29922" : "#f85149" }}>
                {resultat.score}%
              </span>
            </div>
            <div style={{ background: "var(--bg-tertiary)", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: "4px",
                width: `${resultat.score}%`,
                background: resultat.score >= 75 ? "#3fb950" : resultat.score >= 50 ? "#d29922" : "#f85149",
                transition: "width 0.6s ease",
              }} />
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Compétences matchées
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {resultat.competences_ok?.map((c) => (
                <span key={c} style={{
                  fontSize: "12px", padding: "3px 10px", borderRadius: "20px",
                  color: "#3fb950", background: "rgba(63,185,80,0.1)", border: "1px solid rgba(63,185,80,0.2)",
                }}>
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              À renforcer
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {resultat.competences_manquantes?.map((c) => (
                <span key={c} style={{
                  fontSize: "12px", padding: "3px 10px", borderRadius: "20px",
                  color: "#f85149", background: "rgba(248,81,73,0.1)", border: "1px solid rgba(248,81,73,0.2)",
                }}>
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div style={{
            background: "var(--bg-primary)", border: "1px solid var(--border)",
            borderRadius: "6px", padding: "14px",
          }}>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
              {resultat.resume}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
