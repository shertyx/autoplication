"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

export default function Chat() {
  const { data: session } = useSession();
  const { friendEmail: encodedEmail } = useParams();
  const friendEmail = decodeURIComponent(encodedEmail);
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [friendInfo, setFriendInfo] = useState(null);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    loadFriendInfo();
    loadMessages();
    pollRef.current = setInterval(loadMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [friendEmail]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadFriendInfo() {
    const res = await fetch("/api/social/friends");
    const data = await res.json();
    const friend = (data.friends || []).find((f) => f.email === friendEmail);
    if (friend) setFriendInfo(friend);
  }

  async function loadMessages() {
    const res = await fetch(`/api/social/chat?with=${encodeURIComponent(friendEmail)}`);
    const data = await res.json();
    setMessages(Array.isArray(data) ? data : []);
  }

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    const t = text;
    setText("");
    await fetch("/api/social/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toEmail: friendEmail, text: t }),
    });
    loadMessages();
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <main style={{ maxWidth: "700px", margin: "0 auto", padding: "0 16px", display: "flex", flexDirection: "column", height: "calc(100vh - 56px)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px 0", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <button onClick={() => router.push("/amis")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "20px", padding: "0 4px" }}>←</button>
        {friendInfo?.image ? (
          <Image src={friendInfo.image} alt={friendInfo.name ?? ""} width={36} height={36} style={{ borderRadius: "50%" }} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#58a6ff,#bc8cff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "#fff" }}>
            {friendInfo?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div>
          <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>{friendInfo?.name ?? friendEmail}</p>
          <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{friendEmail}</p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 0", display: "flex", flexDirection: "column", gap: "8px" }}>
        {messages.length === 0 && (
          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "13px", marginTop: "40px" }}>
            Début de la conversation avec {friendInfo?.name ?? friendEmail}
          </p>
        )}
        {messages.map((m) => {
          const isMe = m.from === session?.user?.email;
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end", gap: "8px" }}>
              {!isMe && (
                m.fromImage ? (
                  <Image src={m.fromImage} alt={m.fromName ?? ""} width={24} height={24} style={{ borderRadius: "50%", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg,#58a6ff,#bc8cff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", flexShrink: 0 }}>
                    {m.fromName?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )
              )}
              <div style={{ maxWidth: "70%" }}>
                <div style={{
                  padding: "8px 12px",
                  borderRadius: isMe ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  background: isMe ? "var(--accent)" : "var(--bg-secondary)",
                  border: isMe ? "none" : "1px solid var(--border)",
                  color: isMe ? "#fff" : "var(--text-primary)",
                  fontSize: "14px", lineHeight: "1.4",
                }}>
                  {m.text}
                </div>
                <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "3px", textAlign: isMe ? "right" : "left" }}>
                  {formatTime(m.date)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} style={{ display: "flex", gap: "8px", padding: "12px 0", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Écris un message..."
          style={{ flex: 1 }}
          autoFocus
        />
        <button type="submit" disabled={!text.trim()} style={{
          padding: "6px 16px", fontSize: "13px",
          background: text.trim() ? "var(--accent)" : "var(--bg-tertiary)",
          border: "none", borderRadius: "6px",
          color: text.trim() ? "#fff" : "var(--text-muted)",
          cursor: text.trim() ? "pointer" : "not-allowed",
          transition: "all 0.15s",
        }}>
          Envoyer
        </button>
      </form>
    </main>
  );
}
