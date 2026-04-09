"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [candidatures, setCandidatures] = useState([]);
  const [corbeille, setCorbeille] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    fetch("/api/candidatures")
      .then((r) => r.json())
      .then((data) => {
        setCandidatures(data.candidatures || []);
        setCorbeille(data.corbeille || []);
        setHydrated(true);
      });
  }, []);

  const save = useCallback((newCandidatures, newCorbeille) => {
    fetch("/api/candidatures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidatures: newCandidatures, corbeille: newCorbeille }),
    });
  }, []);

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
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}