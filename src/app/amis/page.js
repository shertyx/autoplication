"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

function Avatar({ user, size = 32 }) {
  if (user?.image) return <Image src={user.image} alt={user.name ?? ""} width={size} height={size} style={{ borderRadius: "50%" }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#58a6ff,#bc8cff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 600, color: "#fff", flexShrink: 0 }}>
      {user?.name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export default function Amis() {
  const { data: session } = useSession();
  const router = useRouter();
  const [friends, setFriends] = useState([]);
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("friends");
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => { loadFriends(); }, []);

  async function loadFriends() {
    setLoading(true);
    const res = await fetch("/api/social/friends");
    const data = await res.json();
    setFriends(data.friends || []);
    setReceived(data.received || []);
    setSent(data.sent || []);
    setLoading(false);
  }

  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/social/search?q=${encodeURIComponent(search)}`);
      const data = await res.json();
      setResults(data);
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  function copyInviteLink() {
    navigator.clipboard.writeText("https://applify.vercel.app");
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  }

  async function sendRequest(toEmail) {
    await fetch("/api/social/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toEmail }),
    });
    loadFriends();
    setSearch("");
    setResults([]);
  }

  async function respond(fromEmail, action) {
    await fetch("/api/social/friends/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromEmail, action }),
    });
    loadFriends();
  }

  const card = { background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", padding: "20px", marginBottom: "16px" };
  const tabs = [
    { key: "friends", label: `Amis (${friends.length})` },
    { key: "received", label: `Demandes reçues (${received.length})` },
    { key: "sent", label: `Demandes envoyées (${sent.length})` },
  ];

  return (
    <main style={{ maxWidth: "700px", margin: "0 auto", padding: "32px 16px" }}>
      <div className="animate-in" style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>Amis</h1>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Connecte-toi avec d'autres utilisateurs d'Applify</p>
      </div>

      {/* Recherche */}
      <div className="animate-in" style={card}>
        <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", marginBottom: "12px" }}>Rechercher un utilisateur</p>
        <input
          placeholder="Nom ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", marginBottom: results.length ? "12px" : 0 }}
        />
        {searching && <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>Recherche...</p>}

        {/* Invitation si email saisi mais aucun résultat */}
        {!searching && search.includes("@") && results.length === 0 && search.length > 4 && (
          <div style={{ paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <div>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
                  Aucun compte trouvé pour <strong style={{ color: "var(--text-primary)" }}>{search}</strong>
                </p>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                  Partage le lien de l'app pour l'inviter
                </p>
              </div>
              <button
                onClick={copyInviteLink}
                style={{
                  fontSize: "12px", padding: "5px 12px",
                  background: linkCopied ? "rgba(63,185,80,0.1)" : "transparent",
                  border: "1px solid " + (linkCopied ? "rgba(63,185,80,0.3)" : "var(--accent)"),
                  borderRadius: "6px",
                  color: linkCopied ? "#3fb950" : "var(--accent)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {linkCopied ? "Lien copié ✓" : "Copier le lien"}
              </button>
            </div>
          </div>
        )}

        {results.map((u) => {
          const isFriend = friends.some((f) => f.email === u.email);
          const isPending = sent.some((r) => r.email === u.email);
          return (
            <div key={u.email} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Avatar user={u} />
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>{u.name}</p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{u.email}</p>
                </div>
              </div>
              {isFriend ? (
                <span style={{ fontSize: "12px", color: "#3fb950" }}>Ami ✓</span>
              ) : isPending ? (
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Demande envoyée</span>
              ) : (
                <button onClick={() => sendRequest(u.email)} style={{ fontSize: "12px", padding: "5px 12px", background: "#238636", border: "1px solid #2ea043", borderRadius: "6px", color: "#fff", cursor: "pointer" }}>
                  + Ajouter
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            fontSize: "12px", padding: "5px 12px",
            background: tab === t.key ? "var(--bg-tertiary)" : "transparent",
            border: "1px solid " + (tab === t.key ? "var(--accent)" : "var(--border)"),
            borderRadius: "6px", color: tab === t.key ? "var(--accent)" : "var(--text-secondary)",
            cursor: "pointer", transition: "all 0.15s",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Chargement...</p>
      ) : (
        <div style={card}>
          {tab === "friends" && (
            friends.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>Aucun ami pour l'instant. Utilise la recherche pour en ajouter !</p>
            ) : friends.map((f) => (
              <div key={f.email} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Avatar user={f} />
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>{f.name}</p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{f.email}</p>
                  </div>
                </div>
                <button onClick={() => router.push(`/chat/${encodeURIComponent(f.email)}`)} style={{ fontSize: "12px", padding: "5px 12px", background: "transparent", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--accent)", cursor: "pointer" }}>
                  💬 Chat
                </button>
              </div>
            ))
          )}

          {tab === "received" && (
            received.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>Aucune demande reçue.</p>
            ) : received.map((r) => (
              <div key={r.email} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Avatar user={r} />
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>{r.name}</p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{r.email}</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={() => respond(r.email, "accept")} style={{ fontSize: "12px", padding: "5px 12px", background: "#238636", border: "1px solid #2ea043", borderRadius: "6px", color: "#fff", cursor: "pointer" }}>Accepter</button>
                  <button onClick={() => respond(r.email, "decline")} style={{ fontSize: "12px", padding: "5px 12px", background: "transparent", border: "1px solid rgba(248,81,73,0.3)", borderRadius: "6px", color: "var(--danger)", cursor: "pointer" }}>Refuser</button>
                </div>
              </div>
            ))
          )}

          {tab === "sent" && (
            sent.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>Aucune demande envoyée.</p>
            ) : sent.map((r) => (
              <div key={r.email} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
                <Avatar user={r} />
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>{r.name}</p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>En attente...</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}
