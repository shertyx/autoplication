"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

const AppContext = createContext();

export function AppProvider({ children }) {
  const { data: session, status } = useSession();
  const [candidatures, setCandidatures] = useState([]);
  const [corbeille, setCorbeille] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [analyses, setAnalyses] = useState({});

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user?.email) {
      // Guest — use localStorage
      try {
        const stored = JSON.parse(localStorage.getItem("applify_candidatures") || "{}");
        setCandidatures(Array.isArray(stored.candidatures) ? stored.candidatures : []);
        setCorbeille(Array.isArray(stored.corbeille) ? stored.corbeille : []);
      } catch {}
      setHydrated(true);
      return;
    }

    // Authenticated — use Redis via API
    fetch("/api/candidatures")
      .then((r) => r.json())
      .then((data) => {
        setCandidatures(data.candidatures || []);
        setCorbeille(data.corbeille || []);
        setHydrated(true);
      })
      .catch(() => setHydrated(true));

    fetch("/api/analyse/saved")
      .then((r) => r.ok ? r.json() : {})
      .then((data) => setAnalyses(data))
      .catch(() => {});
  }, [status, session?.user?.email]);

  function setAnalyseForOffre(offreId, data) {
    if (!offreId) return;
    setAnalyses((prev) => ({ ...prev, [offreId]: data }));
  }

  function removeAnalyse(offreId) {
    setAnalyses((prev) => { const n = { ...prev }; delete n[offreId]; return n; });
  }

  const save = useCallback((newCandidatures, newCorbeille) => {
    if (!session?.user?.email) {
      try {
        localStorage.setItem("applify_candidatures", JSON.stringify({ candidatures: newCandidatures, corbeille: newCorbeille }));
      } catch {}
      return;
    }
    fetch("/api/candidatures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidatures: newCandidatures, corbeille: newCorbeille }),
    });
  }, [session?.user?.email]);

  function postuler(offre) {
    setCandidatures((prev) => {
      if (prev.find((c) => c.id === offre.id)) return prev;
      const next = [...prev, { ...offre, statut: "sent", datePostulation: new Date().toLocaleDateString("fr-FR") }];
      save(next, corbeille);
      return next;
    });
  }

  function mettreEnAttente(offre) {
    setCandidatures((prev) => {
      if (prev.find((c) => c.id === offre.id)) return prev;
      const next = [...prev, { ...offre, statut: "saved", datePostulation: new Date().toLocaleDateString("fr-FR") }];
      save(next, corbeille);
      return next;
    });
  }

  function changerStatut(id, statut) {
    setCandidatures((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, statut } : c));
      save(next, corbeille);
      return next;
    });
  }

  function mettreEnCorbeille(offre) {
    setCandidatures((prev) => {
      const next = prev.filter((c) => c.id !== offre.id);
      setCorbeille((prevC) => {
        const nextC = prevC.find((c) => c.id === offre.id) ? prevC : [...prevC, offre];
        save(next, nextC);
        return nextC;
      });
      return next;
    });
  }

  function supprimer(id) {
    setCandidatures((prev) => {
      const candidature = prev.find((c) => c.id === id);
      const next = prev.filter((c) => c.id !== id);
      setCorbeille((prevC) => {
        const nextC = candidature ? [...prevC, candidature] : prevC;
        save(next, nextC);
        return nextC;
      });
      return next;
    });
  }

  function restaurer(id) {
    setCorbeille((prevC) => {
      const offre = prevC.find((c) => c.id === id);
      const nextC = prevC.filter((c) => c.id !== id);
      setCandidatures((prev) => {
        const next = offre ? [...prev, offre] : prev;
        save(next, nextC);
        return next;
      });
      return nextC;
    });
  }

  function restaurerDansOffres(id) {
    setCorbeille((prev) => {
      const next = prev.filter((c) => c.id !== id);
      save(candidatures, next);
      return next;
    });
  }

  function viderCorbeille() {
    setCorbeille([]);
    save(candidatures, []);
  }

  if (!hydrated) return null;

  return (
    <AppContext.Provider value={{
      candidatures, corbeille,
      postuler, mettreEnAttente, changerStatut,
      supprimer, mettreEnCorbeille,
      restaurer, restaurerDansOffres, viderCorbeille,
      analyses, setAnalyseForOffre, removeAnalyse,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
