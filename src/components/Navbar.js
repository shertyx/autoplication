"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";

const links = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  },
  {
    href: "/offres",
    label: "Offres",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  },
  {
    href: "/analyse",
    label: "Analyser",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
  },
  {
    href: "/lettre",
    label: "Lettre",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  },
  {
    href: "/amis",
    label: "Amis",
    auth: true,
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    href: "/profil",
    label: "Profil",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const { candidatures } = useApp();
  const { data: session } = useSession();
  const entretiens = candidatures.filter((c) => c.statut === "interview").length;
  const [unread, setUnread] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const key = `registered_${session.user.email}`;
    if (!sessionStorage.getItem(key)) {
      fetch("/api/social/register", { method: "POST" }).then(() => {
        sessionStorage.setItem(key, "1");
      });
    }
    loadNotifs();
    const interval = setInterval(loadNotifs, 30000);
    return () => clearInterval(interval);
  }, [session]);

  async function loadNotifs() {
    try {
      const res = await fetch("/api/social/notifications");
      const data = await res.json();
      setUnread((Array.isArray(data) ? data : []).filter((n) => !n.read).length);
    } catch {}
  }

  return (
    <nav style={{
      background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)",
      padding: "0 16px", display: "flex", alignItems: "center",
      justifyContent: "space-between", height: "56px", position: "sticky", top: 0, zIndex: 100,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "linear-gradient(135deg, #58a6ff, #bc8cff)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </div>
        <span className="mobile-hide" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "0.02em" }}>
          Applify
        </span>
      </div>

      <div style={{ display: "flex", gap: "2px" }}>
        {links.filter((l) => !l.auth || session?.user).map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link key={link.href} href={link.href} style={{
              fontSize: "13px", padding: "6px 10px", borderRadius: "6px", textDecoration: "none",
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              background: isActive ? "var(--bg-tertiary)" : "transparent",
              display: "flex", alignItems: "center", gap: "6px",
              transition: "all 0.15s", position: "relative",
            }}>
              <span style={{ color: isActive ? "var(--accent)" : "currentColor" }}>{link.icon}</span>
              <span className="mobile-hide">{link.label}</span>
              {link.href === "/dashboard" && entretiens > 0 && (
                <span style={{ fontSize: "10px", fontWeight: 600, background: "#3fb950", color: "#fff", borderRadius: "20px", padding: "1px 6px", minWidth: "16px", textAlign: "center" }}>
                  {entretiens}
                </span>
              )}
              {link.href === "/amis" && unread > 0 && (
                <span style={{ fontSize: "10px", fontWeight: 600, background: "var(--danger)", color: "#fff", borderRadius: "20px", padding: "1px 6px", minWidth: "16px", textAlign: "center" }}>
                  {unread}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {session?.user && (
          <div className="mobile-hide" style={{ fontSize: "11px", color: "var(--text-muted)", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "20px", padding: "3px 10px" }}>
            {candidatures.length} candidature{candidatures.length !== 1 ? "s" : ""}
          </div>
        )}

        {session?.user ? (
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              title={session.user.name ?? "Mon compte"}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, borderRadius: "50%" }}
            >
              {session.user.image ? (
                <Image src={session.user.image} alt={session.user.name ?? "Avatar"} width={30} height={30} style={{ borderRadius: "50%", display: "block" }} />
              ) : (
                <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "linear-gradient(135deg, #58a6ff, #bc8cff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, color: "#fff" }}>
                  {session.user.name?.[0]?.toUpperCase() ?? "U"}
                </div>
              )}
            </button>

            {dropdownOpen && (
              <div style={{
                position: "absolute", right: 0, top: "38px",
                background: "var(--bg-secondary)", border: "1px solid var(--border)",
                borderRadius: "8px", padding: "4px", minWidth: "180px", zIndex: 200,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}>
                <div style={{ padding: "8px 12px", marginBottom: "4px", borderBottom: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>{session.user.name}</p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, marginTop: "2px" }}>{session.user.email}</p>
                </div>
                <button
                  onClick={() => { signOut({ callbackUrl: "/login" }); setDropdownOpen(false); }}
                  style={{
                    width: "100%", textAlign: "left", padding: "8px 12px",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: "13px", color: "var(--danger)", borderRadius: "4px",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(248,81,73,0.08)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                >
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" style={{
            fontSize: "13px", padding: "6px 14px",
            background: "#238636", border: "1px solid #2ea043",
            borderRadius: "6px", color: "#fff", textDecoration: "none",
            whiteSpace: "nowrap", fontWeight: 500,
          }}>
            Se connecter
          </Link>
        )}
      </div>
    </nav>
  );
}
