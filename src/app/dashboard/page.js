"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";

const STATUTS = {
  sent: { label: "Envoyé", color: "#d29922", bg: "rgba(210, 153, 34, 0.1)" },
  interview: { label: "Entretien", color: "#3fb950", bg: "rgba(63, 185, 80, 0.1)" },
  refused: { label: "Refusé", color: "#f85149", bg: "rgba(248, 81, 73, 0.1)" },
  saved: { label: "Sauvegardé", color: "#bc8cff", bg: "rgba(188, 140, 255, 0.1)" },
};

export default function Dashboard() {
  const { candidatures, postuler, changerStatut, mettreEnCorbeille } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titre: "", entreprise: "", source: "LinkedIn", statut: "sent" });

  const stats = {
    total: candidatures.length,
    entretiens: candidatures.filter((c) => c.statut === "interview").length,
    enAttente: candidatures.filter((c) => c.statut === "sent").length,
    tauxReponse: candidatures.length > 0
      ? Math.round((candidatures.filter((c) => ["interview", "refused"].includes(c.statut)).length / candidatures.length) * 100)
      : 0,
  };

  function ajouterManuellement() {
    if (!form.titre || !form.entreprise) return;
    postuler({ id: `manuel-${Date.now()}`, titre: form.titre, entreprise: form.entreprise, source: form.source, statut: form.statut, lieu: "N/A", lien: "#" });
    setForm({ titre: "", entreprise: "", source: "LinkedIn", statut: "sent" });
    setShowForm(false);
  }

  return (
    <main style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px" }}>
      <div className="animate-in" style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
          Dashboard
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          Félix Caron · Data Analyst / Ingénieur IA
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Candidatures", value: stats.total, color: "#58a6ff" },
          { label: "Entretiens", value: stats.entretiens, color: "#3fb950" },
          { label: "En attente", value: stats.enAttente, color: "#d29922" },
          { label: "Taux de réponse", value: `${stats.tauxReponse}%`, color: "#bc8cff" },
        ].map((s, i) => (
          <div key={s.label} className="animate-in" style={{
            animationDelay: `${i * 60}ms`,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "16px",
          }}>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {s.label}
            </p>
            <p style={{ fontSize: "26px", fontWeight: 600, color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        overflow: "hidden",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
        }}>
          <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>
            Mes candidatures
          </span>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              fontSize: "12px",
              padding: "5px 12px",
              background: showForm ? "var(--bg-tertiary)" : "transparent",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            + Ajouter
          </button>
        </div>

        {showForm && (
          <div className="animate-in" style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-primary)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}>
            <div>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Poste</label>
              <input placeholder="Data Analyst" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Entreprise</label>
              <input placeholder="Nom de la boîte" value={form.entreprise} onChange={(e) => setForm({ ...form, entreprise: e.target.value })} style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Source</label>
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} style={{ width: "100%" }}>
                {["LinkedIn", "Indeed", "Welcome to the Jungle", "France Travail", "Autre"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Statut</label>
              <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })} style={{ width: "100%" }}>
                {Object.entries(STATUTS).map(([val, { label }]) => <option key={val} value={val}>{label}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "span 2", display: "flex", gap: "8px" }}>
              <button onClick={ajouterManuellement} style={{
                fontSize: "13px", padding: "6px 16px",
                background: "#238636", border: "1px solid #2ea043",
                borderRadius: "6px", color: "#fff", cursor: "pointer",
              }}>
                Enregistrer
              </button>
              <button onClick={() => setShowForm(false)} style={{
                fontSize: "13px", padding: "6px 16px",
                background: "transparent", border: "1px solid var(--border)",
                borderRadius: "6px", color: "var(--text-secondary)", cursor: "pointer",
              }}>
                Annuler
              </button>
            </div>
          </div>
        )}

        {candidatures.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Aucune candidature pour l'instant.<br />
              Postule depuis la page Offres ou ajoute manuellement !
            </p>
          </div>
        ) : (
          <div>
            {candidatures.map((c, i) => (
              <div key={c.id} className="animate-in" style={{
                animationDelay: `${i * 40}ms`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 20px",
                borderBottom: i < candidatures.length - 1 ? "1px solid var(--border-light)" : "none",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(88,166,255,0.03)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)", marginBottom: "2px" }}>
                    {c.titre}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {c.entreprise} · {c.source} · {c.datePostulation}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{
                    fontSize: "11px", padding: "3px 8px", borderRadius: "20px",
                    color: STATUTS[c.statut]?.color,
                    background: STATUTS[c.statut]?.bg,
                    fontWeight: 500,
                  }}>
                    {STATUTS[c.statut]?.label}
                  </span>
                  <select
                    value={c.statut}
                    onChange={(e) => changerStatut(c.id, e.target.value)}
                    style={{ fontSize: "12px", padding: "3px 8px !important" }}
                  >
                    {Object.entries(STATUTS).map(([val, { label }]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                  <button
                    onClick={() => mettreEnCorbeille(c)}
                    style={{
                      background: "none", border: "none",
                      color: "var(--text-muted)", cursor: "pointer",
                      fontSize: "16px", padding: "2px 4px",
                      borderRadius: "4px", transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "var(--danger)"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
