"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";

const links = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    href: "/offres",
    label: "Offres",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/>
      </svg>
    ),
  },
  {
    href: "/analyse",
    label: "Analyser",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ),
  },
  {
    href: "/lettre",
    label: "Lettre",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
  },
  {
    href: "/profil",
    label: "Profil",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const { candidatures } = useApp();
  const { data: session } = useSession();
  const entretiens = candidatures.filter((c) => c.statut === "interview").length;

  if (!session) return null;

  return (
    <nav style={{
      background: "var(--bg-secondary)",
      borderBottom: "1px solid var(--border)",
      padding: "0 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: "56px",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{
          width: "24px", height: "24px", borderRadius: "6px",
          background: "linear-gradient(135deg, #58a6ff, #bc8cff)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
        <span className="mobile-hide" style={{
          fontSize: "13px", fontWeight: 600,
          color: "var(--text-primary)", letterSpacing: "0.02em",
        }}>
          Autoplication
        </span>
      </div>

      <div style={{ display: "flex", gap: "2px" }}>
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontSize: "13px", padding: "6px 10px",
                borderRadius: "6px", textDecoration: "none",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
                background: active ? "var(--bg-tertiary)" : "transparent",
                display: "flex", alignItems: "center", gap: "6px",
                transition: "all 0.15s",
                position: "relative",
              }}
            >
              <span style={{ color: active ? "var(--accent)" : "currentColor" }}>
                {link.icon}
              </span>
              <span className="mobile-hide">{link.label}</span>
              {link.href === "/dashboard" && entretiens > 0 && (
                <span style={{
                  fontSize: "10px", fontWeight: 600,
                  background: "#3fb950", color: "#fff",
                  borderRadius: "20px", padding: "1px 6px",
                  minWidth: "16px", textAlign: "center",
                }}>
                  {entretiens}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div className="mobile-hide" style={{
          fontSize: "11px", color: "var(--text-muted)",
          background: "var(--bg-tertiary)", border: "1px solid var(--border)",
          borderRadius: "20px", padding: "3px 10px",
        }}>
          {candidatures.length} candidature{candidatures.length !== 1 ? "s" : ""}
        </div>
        {session?.user && (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title={`Déconnexion (${session.user.name})`}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: 0, flexShrink: 0, borderRadius: "50%",
            }}
          >
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name ?? "Avatar"}
                width={30}
                height={30}
                style={{ borderRadius: "50%", display: "block" }}
              />
            ) : (
              <div style={{
                width: "30px", height: "30px", borderRadius: "50%",
                background: "linear-gradient(135deg, #58a6ff, #bc8cff)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", fontWeight: 600, color: "#fff",
              }}>
                {session.user.name?.[0]?.toUpperCase() ?? "U"}
              </div>
            )}
          </button>
        )}
      </div>
    </nav>
  );
}
