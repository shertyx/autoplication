"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function ConsentBanner() {
  const { data: session } = useSession();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    const key = `gdpr_consent_${session.user.email}`;
    if (!localStorage.getItem(key)) setVisible(true);
  }, [session]);

  function accept() {
    const key = `gdpr_consent_${session.user.email}`;
    localStorage.setItem(key, "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "var(--bg-secondary)", borderTop: "1px solid var(--border)",
      padding: "16px 24px", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: "16px", flexWrap: "wrap",
      boxShadow: "0 -4px 24px rgba(0,0,0,0.3)",
    }}>
      <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, flex: 1, minWidth: "200px" }}>
        Autoplication utilise des données personnelles (email, CV, candidatures) pour personnaliser ton expérience.{" "}
        <Link href="/politique-confidentialite" style={{ color: "var(--accent)", textDecoration: "underline" }}>
          Politique de confidentialité
        </Link>
      </p>
      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        <button
          onClick={accept}
          style={{
            fontSize: "13px", padding: "7px 18px",
            background: "#238636", border: "1px solid #2ea043",
            borderRadius: "6px", color: "#fff", cursor: "pointer",
            fontWeight: 500,
          }}
        >
          J'accepte
        </button>
      </div>
    </div>
  );
}
