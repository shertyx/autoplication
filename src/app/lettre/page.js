"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LettreForm() {
  const searchParams = useSearchParams();
  const [entreprise, setEntreprise] = useState(searchParams.get("entreprise") || "");
  const [poste, setPoste] = useState(searchParams.get("titre") || "");
  const [offre, setOffre] = useState("");
  const [ton, setTon] = useState("professionnel");
  const [loading, setLoading] = useState(false);
  const [lettre, setLettre] = useState("");
  const [copied, setCopied] = useState(false);

  async function genererLettre() {
    if (!entreprise || !poste) return;
    setLoading(true);
    setLettre("");
    try {
      const res = await fetch("/api/lettre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entreprise, poste, offre, ton }),
      });
      const data = await res.json();
      setLettre(data.lettre || data.error);
    } catch {
      setLettre("Erreur lors de la génération.");
    } finally {
      setLoading(false);
    }
  }

  function copier() {
    navigator.clipboard.writeText(lettre);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "32px 24px" }}>
      <div className="animate-in" style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
          Lettre de motivation
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          Génère une lettre personnalisée en quelques secondes
        </p>
      </div>

      <div className="animate-in" style={{
        background: "var(--bg-secondary)", border: "1px solid var(--border)",
        borderRadius: "8px", padding: "20px", marginBottom: "16px",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
          <div>
            <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Entreprise
            </label>
            <input
              placeholder="Decathlon, Leroy Merlin..."
              value={entreprise}
              onChange={(e) => setEntreprise(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Poste
            </label>
            <input
              placeholder="Data Analyst..."
              value={poste}
              onChange={(e) => setPoste(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Description de l'offre (optionnel)
          </label>
          <textarea
            placeholder="Colle la fiche de poste ici pour une lettre plus personnalisée..."
            value={offre}
            onChange={(e) => setOffre(e.target.value)}
            style={{ width: "100%", minHeight: "90px", resize: "vertical" }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Ton
          </label>
          <select value={ton} onChange={(e) => setTon(e.target.value)} style={{ width: "100%" }}>
            <option value="professionnel">Professionnel et structuré</option>
            <option value="dynamique">Dynamique et enthousiaste</option>
            <option value="concis">Concis et direct</option>
          </select>
        </div>

        <button
          onClick={genererLettre}
          disabled={loading || !entreprise || !poste}
          style={{
            fontSize: "13px", padding: "7px 18px",
            background: loading || !entreprise || !poste ? "var(--bg-tertiary)" : "#238636",
            border: "1px solid " + (loading || !entreprise || !poste ? "var(--border)" : "#2ea043"),
            borderRadius: "6px",
            color: loading || !entreprise || !poste ? "var(--text-muted)" : "#fff",
            cursor: loading || !entreprise || !poste ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {loading ? "Génération en cours..." : "Générer la lettre"}
        </button>
      </div>

      {lettre && (
        <div className="animate-in" style={{
          background: "var(--bg-secondary)", border: "1px solid var(--border)",
          borderRadius: "8px", padding: "20px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>
              Lettre générée
            </h2>
            <button
              onClick={copier}
              style={{
                fontSize: "12px", padding: "5px 12px",
                background: copied ? "rgba(63,185,80,0.1)" : "transparent",
                border: "1px solid " + (copied ? "rgba(63,185,80,0.3)" : "var(--border)"),
                borderRadius: "6px",
                color: copied ? "#3fb950" : "var(--text-secondary)",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {copied ? "Copié !" : "Copier"}
            </button>
          </div>
          <div style={{
            background: "var(--bg-primary)", border: "1px solid var(--border)",
            borderRadius: "6px", padding: "16px",
          }}>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.8", whiteSpace: "pre-wrap" }}>
              {lettre}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

export default function Lettre() {
  return (
    <Suspense>
      <LettreForm />
    </Suspense>
  );
}
