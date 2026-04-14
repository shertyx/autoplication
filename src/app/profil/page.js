"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

export default function Profil() {
  const { data: session } = useSession();
  const [cv, setCv] = useState("");
  const [nom, setNom] = useState("");
  const [poste, setPoste] = useState("");
  const [ville, setVille] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);

  useEffect(() => {
    fetch("/api/profil")
      .then((r) => r.json())
      .then((data) => {
        if (data.cv) setCv(data.cv);
        if (data.nom) setNom(data.nom);
        if (data.poste) setPoste(data.poste);
        if (data.ville) setVille(data.ville);
      });
  }, []);

  async function handlePdf(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setParseError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profil/parse", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCv(data.text);
    } catch (e) {
      setParseError("Impossible de lire le PDF : " + e.message);
    } finally {
      setParsing(false);
    }
  }

  async function supprimerCompte() {
    if (!confirm("Es-tu sûr ? Cette action supprime définitivement toutes tes données (candidatures, CV, messages, amis). Elle est irréversible.")) return;
    setDeleting(true);
    await fetch("/api/account/delete", { method: "DELETE" });
    await signOut({ callbackUrl: "/login" });
  }

  async function sauvegarder() {
    setSaving(true);
    await fetch("/api/profil", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cv, nom, poste, ville }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const label = { fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" };
  const card = { background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", padding: "20px", marginBottom: "16px" };

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "32px 16px" }}>
      <div className="animate-in" style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
          Mon profil
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          Ton CV est utilisé pour personnaliser le scoring et les lettres de motivation
        </p>
      </div>

      {/* Infos */}
      <div className="animate-in" style={card}>
        <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", marginBottom: "16px" }}>
          Informations
        </p>
        <div className="mobile-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          <div>
            <label style={label}>Nom complet</label>
            <input
              placeholder={session?.user?.name ?? "Ton nom"}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label style={label}>Poste recherché</label>
            <input
              placeholder="Data Analyst, Dev Full Stack..."
              value={poste}
              onChange={(e) => setPoste(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label style={label}>Ville</label>
            <input
              placeholder="Lille, Paris..."
              value={ville}
              onChange={(e) => setVille(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </div>

      {/* CV */}
      <div className="animate-in" style={{ ...card, animationDelay: "60ms" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", marginBottom: "2px" }}>
              CV
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Upload un PDF ou colle le texte directement
            </p>
          </div>
          <label style={{
            fontSize: "12px", padding: "6px 14px",
            background: parsing ? "var(--bg-tertiary)" : "transparent",
            border: "1px solid var(--border)",
            borderRadius: "6px", color: parsing ? "var(--text-muted)" : "var(--text-secondary)",
            cursor: parsing ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}>
            {parsing ? "Lecture..." : "Importer PDF"}
            <input type="file" accept=".pdf" onChange={handlePdf} style={{ display: "none" }} disabled={parsing} />
          </label>
        </div>

        {parseError && (
          <div style={{ marginBottom: "12px", padding: "8px 12px", background: "rgba(248,81,73,0.1)", border: "1px solid rgba(248,81,73,0.3)", borderRadius: "6px", fontSize: "12px", color: "var(--danger)" }}>
            {parseError}
          </div>
        )}

        {cv && (
          <div style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3fb950", flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "#3fb950" }}>
              CV chargé ({cv.length} caractères)
            </span>
          </div>
        )}

        <textarea
          value={cv}
          onChange={(e) => setCv(e.target.value)}
          placeholder="Colle ici le contenu de ton CV : formation, expériences, compétences, langues..."
          style={{ width: "100%", minHeight: "200px", resize: "vertical", fontSize: "13px" }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <button
          onClick={sauvegarder}
          disabled={saving}
          style={{
            fontSize: "13px", padding: "8px 20px",
            background: saved ? "rgba(63,185,80,0.15)" : saving ? "var(--bg-tertiary)" : "#238636",
            border: "1px solid " + (saved ? "rgba(63,185,80,0.4)" : saving ? "var(--border)" : "#2ea043"),
            borderRadius: "6px",
            color: saved ? "#3fb950" : saving ? "var(--text-muted)" : "#fff",
            cursor: saving ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {saved ? "Sauvegardé !" : saving ? "Sauvegarde..." : "Sauvegarder"}
        </button>

        <button
          onClick={supprimerCompte}
          disabled={deleting}
          style={{
            fontSize: "12px", padding: "8px 16px",
            background: "transparent",
            border: "1px solid rgba(248,81,73,0.3)",
            borderRadius: "6px", color: "var(--danger)",
            cursor: deleting ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {deleting ? "Suppression..." : "Supprimer mon compte"}
        </button>
      </div>
    </main>
  );
}
