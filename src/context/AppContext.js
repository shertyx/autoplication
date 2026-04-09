"use client";

import { createContext, useContext, useState, useEffect } from "react";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [candidatures, setCandidatures] = useState([]);
  const [corbeille, setCorbeille] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  // Charger depuis localStorage au démarrage
  useEffect(() => {
    try {
      const c = localStorage.getItem("candidatures");
      const b = localStorage.getItem("corbeille");
      if (c) setCandidatures(JSON.parse(c));
      if (b) setCorbeille(JSON.parse(b));
    } catch {}
    setHydrated(true);
  }, []);

  // Sauvegarder à chaque changement
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("candidatures", JSON.stringify(candidatures));
  }, [candidatures, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("corbeille", JSON.stringify(corbeille));
  }, [corbeille, hydrated]);

  function postuler(offre) {
    setCandidatures((prev) => {
      if (prev.find((c) => c.id === offre.id)) return prev;
      return [...prev, {
        ...offre,
        statut: "sent",
        datePostulation: new Date().toLocaleDateString("fr-FR"),
      }];
    });
  }

  function mettreEnAttente(offre) {
    setCandidatures((prev) => {
      if (prev.find((c) => c.id === offre.id)) return prev;
      return [...prev, {
        ...offre,
        statut: "saved",
        datePostulation: new Date().toLocaleDateString("fr-FR"),
      }];
    });
  }

  function changerStatut(id, statut) {
    setCandidatures((prev) =>
      prev.map((c) => (c.id === id ? { ...c, statut } : c))
    );
  }

  function mettreEnCorbeille(offre) {
    setCorbeille((prev) => {
      if (prev.find((c) => c.id === offre.id)) return prev;
      return [...prev, offre];
    });
    setCandidatures((prev) => prev.filter((c) => c.id !== offre.id));
  }

  function supprimer(id) {
    const candidature = candidatures.find((c) => c.id === id);
    if (candidature) setCorbeille((prev) => [...prev, candidature]);
    setCandidatures((prev) => prev.filter((c) => c.id !== id));
  }

  function restaurer(id) {
    const offre = corbeille.find((c) => c.id === id);
    if (offre) {
      setCandidatures((prev) => [...prev, offre]);
      setCorbeille((prev) => prev.filter((c) => c.id !== id));
    }
  }

  function restaurerDansOffres(id) {
    setCorbeille((prev) => prev.filter((c) => c.id !== id));
  }

  function viderCorbeille() {
    setCorbeille([]);
  }

  if (!hydrated) return null;

  return (
    <AppContext.Provider value={{
      candidatures, corbeille,
      postuler, mettreEnAttente, changerStatut,
      supprimer, mettreEnCorbeille,
      restaurer, restaurerDansOffres, viderCorbeille
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}