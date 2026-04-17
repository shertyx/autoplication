"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { getGuestId } from "@/lib/guestId";
import Link from "next/link";

export default function Profil() {
  const { data: session, status } = useSession();
  const isGuest = status !== "loading" && !session?.user?.email;
  const [cv, setCv] = useState("");
  const [nom, setNom] = useState("");
  const [poste, setPoste] = useState("");
  const [ville, setVille] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [cpInput, setCpInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [sugLoading, setSugLoading] = useState(false);
  const debounceRef = useRef(null);
  const sugRef = useRef(null);
  const [parseError, setParseError] = useState(null);

  useEffect(() => {
    if (status === "loading") return;
    if (isGuest) {
      try {
        const stored = JSON.parse(localStorage.getItem("applify_profil") || "{}");
        if (stored.cv) setCv(stored.cv);
        if (stored.nom) setNom(stored.nom);
        if (stored.poste) setPoste(stored.poste);
        if (stored.ville) setVille(stored.ville);
      } catch {}
      return;
    }
    fetch("/api/profil")
      .then((r) => r.json())
      .then((data) => {
        if (data.cv) setCv(data.cv);
        if (data.nom) setNom(data.nom);
        if (data.poste) setPoste(data.poste);
        if (data.ville) setVille(data.ville);
      });
  }, [status, isGuest]);

  async function handlePdf(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setParseError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profil/parse", { method: "POST", body: formData, headers: { "x-guest-id": getGuestId() } });
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
    if (isGuest) {
      try {
        localStorage.setItem("applify_profil", JSON.stringify({ cv, nom, poste, ville }));
      } catch {}
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      return;
    }
    try {
      const res = await fetch("/api/profil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv, nom, poste, ville }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setSaveError(false);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveError(true);
      setTimeout(() => setSaveError(false), 4000);
    } finally {
      setSaving(false);
    }
  }

  const zones = ville ? ville.split(",").map((s) => s.trim()).filter(Boolean) : [];

  function addZone(label) {
    if (!label) return;
    if (zones.includes(label)) { setCpInput(""); setSuggestions([]); return; }
    setVille([...zones, label].join(","));
    setCpInput("");
    setSuggestions([]);
  }

  function removeZone(z) {
    setVille(zones.filter((c) => c !== z).join(","));
  }

  function handleCpKeyDown(e) {
    if (e.key === "Escape") { setSuggestions([]); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0) { addZone(suggestions[0].label); return; }
      // fallback: raw 5-digit postal code
      const cp = cpInput.trim();
      if (/^\d{5}$/.test(cp)) addZone(cp);
    } else if (e.key === "Backspace" && cpInput === "" && zones.length > 0) {
      removeZone(zones[zones.length - 1]);
    }
  }

  function handleCpChange(e) {
    const val = e.target.value;
    setCpInput(val);
    setSuggestions([]);
    if (!val.trim() || val.trim().length < 2) return;
    clearTimeout(debounceRef.current);
    setSugLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(val.trim())}&fields=nom,codesPostaux&boost=population&limit=8`
        );
        const data = await res.json();
        setSuggestions(
          (data || []).flatMap((c) =>
            (c.codesPostaux || []).slice(0, 1).map((cp) => ({
              label: `${c.nom} - ${cp}`,
              display: `${c.nom} (${cp})`,
            }))
          ).slice(0, 8)
        );
      } catch { setSuggestions([]); }
      finally { setSugLoading(false); }
    }, 280);
  }

  const label = { fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" };
  const card = { background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", padding: "20px", marginBottom: "16px" };

  const completion = Math.round(
    (nom.trim() ? 15 : 0) +
    (poste.trim() ? 30 : 0) +
    (ville.trim() ? 25 : 0) +
    (cv.trim().length > 100 ? 30 : cv.trim().length > 0 ? 15 : 0)
  );
  const completionColor = completion >= 70 ? "#3fb950" : completion >= 40 ? "#d29922" : "#f85149";
  const missing = [
    !nom.trim() && "Nom complet",
    !poste.trim() && "Poste recherché",
    !ville.trim() && "Ville / Zone",
    cv.trim().length <= 100 && "CV (100+ caractères)",
  ].filter(Boolean);

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

      <div className="animate-in" style={{ ...card, display: "flex", alignItems: "center", gap: "28px" }}>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: "52px", fontWeight: 700, lineHeight: 1, color: completionColor }}>
            {completion}%
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            complété
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ background: "var(--bg-tertiary)", borderRadius: "4px", height: "6px", marginBottom: "12px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${completion}%`, background: completionColor, borderRadius: "4px", transition: "width 0.4s ease" }} />
          </div>
          {missing.length > 0 ? (
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
              Manque : <span style={{ color: "var(--text-secondary)" }}>{missing.join(", ")}</span>
            </p>
          ) : (
            <p style={{ fontSize: "12px", color: "#3fb950", margin: 0 }}>Profil complet — scraping optimisé</p>
          )}
          {completion < 60 && (
            <p style={{ fontSize: "11px", color: "#d29922", marginTop: "6px", marginBottom: 0 }}>
              Le scraping est bloqué jusqu'à 60% — remplis poste, ville et CV
            </p>
          )}
        </div>
      </div>

      {isGuest && (
        <div className="animate-in" style={{
          background: "rgba(88, 166, 255, 0.06)", border: "1px solid rgba(88, 166, 255, 0.2)",
          borderRadius: "8px", padding: "14px 16px", marginBottom: "20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2" style={{ flexShrink: 0, marginTop: "1px" }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, lineHeight: "1.5" }}>
              Sans compte, ton profil et tes candidatures sont enregistrés uniquement dans ce navigateur — ils seront perdus si tu vides ton cache ou changes d'appareil.
            </p>
          </div>
          <Link href="/login" style={{
            fontSize: "12px", padding: "6px 14px",
            background: "#238636", border: "1px solid #2ea043",
            borderRadius: "6px", color: "#fff", textDecoration: "none",
            whiteSpace: "nowrap", fontWeight: 500, flexShrink: 0,
          }}>
            Alors on s'inscrit ?
          </Link>
        </div>
      )}

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
          <div style={{ position: "relative" }} ref={sugRef}>
            <label style={label}>Zone(s) de recherche</label>
            <div
              onClick={() => document.getElementById("cp-input").focus()}
              style={{
                display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center",
                width: "100%", minHeight: "36px", padding: "4px 8px",
                background: "var(--bg-primary)", border: "1px solid var(--border)",
                borderRadius: "6px", cursor: "text", boxSizing: "border-box",
              }}
            >
              {zones.map((z) => (
                <span key={z} style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  background: "var(--bg-tertiary)", border: "1px solid var(--border)",
                  borderRadius: "4px", padding: "2px 8px", fontSize: "12px",
                  color: "var(--text-primary)", whiteSpace: "nowrap",
                }}>
                  {z}
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeZone(z); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, lineHeight: 1, fontSize: "14px" }}>×</button>
                </span>
              ))}
              <input
                id="cp-input"
                value={cpInput}
                onChange={handleCpChange}
                onKeyDown={handleCpKeyDown}
                onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                placeholder={zones.length === 0 ? "Paris, Lille, 59000..." : ""}
                style={{
                  border: "none", outline: "none", background: "transparent",
                  fontSize: "13px", color: "var(--text-primary)",
                  flex: "1", minWidth: "100px", padding: "2px 0",
                }}
              />
              {cpInput.trim().length > 0 && (
                <button type="button"
                  onClick={() => {
                    if (suggestions.length > 0) addZone(suggestions[0].label);
                    else if (/^\d{5}$/.test(cpInput.trim())) addZone(cpInput.trim());
                  }}
                  style={{
                    background: "#238636", border: "1px solid #2ea043", borderRadius: "4px",
                    color: "#fff", cursor: "pointer", fontSize: "16px", lineHeight: 1,
                    padding: "1px 7px", flexShrink: 0,
                  }}>+</button>
              )}
            </div>
            {(suggestions.length > 0 || sugLoading) && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                background: "var(--bg-secondary)", border: "1px solid var(--border)",
                borderRadius: "6px", marginTop: "4px", overflow: "hidden",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}>
                {sugLoading && (
                  <div style={{ padding: "10px 12px", fontSize: "12px", color: "var(--text-muted)" }}>Recherche…</div>
                )}
                {suggestions.map((s) => (
                  <button key={s.label} type="button"
                    onMouseDown={(e) => { e.preventDefault(); addZone(s.label); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "8px 12px", background: "none", border: "none",
                      borderBottom: "1px solid var(--border)", cursor: "pointer",
                      fontSize: "13px", color: "var(--text-primary)",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                  >{s.display}</button>
                ))}
              </div>
            )}
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", marginBottom: 0 }}>
              Tape une ville ou un code postal, sélectionne dans la liste. Plusieurs zones possibles.
            </p>
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
            background: saveError ? "rgba(248,81,73,0.15)" : saved ? "rgba(63,185,80,0.15)" : saving ? "var(--bg-tertiary)" : "#238636",
            border: "1px solid " + (saveError ? "rgba(248,81,73,0.4)" : saved ? "rgba(63,185,80,0.4)" : saving ? "var(--border)" : "#2ea043"),
            borderRadius: "6px",
            color: saveError ? "#f85149" : saved ? "#3fb950" : saving ? "var(--text-muted)" : "#fff",
            cursor: saving ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {saveError ? "Erreur — réessaie" : saved ? "Sauvegardé !" : saving ? "Sauvegarde..." : "Sauvegarder"}
        </button>

        {!isGuest && (
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
        )}
      </div>
    </main>
  );
}
