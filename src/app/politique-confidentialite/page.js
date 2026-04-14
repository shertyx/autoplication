export default function PolitiqueConfidentialite() {
  const section = { marginBottom: "28px" };
  const h2 = { fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "10px" };
  const p = { fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.7", margin: "0 0 8px" };
  const li = { fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.7", marginBottom: "4px" };

  return (
    <main style={{ maxWidth: "720px", margin: "0 auto", padding: "40px 16px" }}>
      <div style={{ marginBottom: "36px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
          Politique de confidentialité
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          Dernière mise à jour : avril 2025 · Applify
        </p>
      </div>

      <div style={section}>
        <h2 style={h2}>1. Qui sommes-nous ?</h2>
        <p style={p}>Applify est une plateforme de recherche d'emploi intelligente accessible sur applify.vercel.app. Elle est développée à titre personnel et non commercial.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>2. Données collectées</h2>
        <p style={p}>Lors de l'utilisation d'Applify, les données suivantes sont collectées et stockées :</p>
        <ul style={{ paddingLeft: "20px", margin: "0" }}>
          {[
            "Nom, adresse email et photo de profil (via connexion Google)",
            "Contenu de votre CV (si renseigné)",
            "Candidatures et leur statut",
            "Messages de chat privés avec vos amis sur la plateforme",
            "Liste d'amis et demandes d'ami",
            "Offres d'emploi consultées et notifications",
          ].map((item, i) => <li key={i} style={li}>• {item}</li>)}
        </ul>
      </div>

      <div style={section}>
        <h2 style={h2}>3. Utilisation des données</h2>
        <p style={p}>Vos données sont utilisées exclusivement pour :</p>
        <ul style={{ paddingLeft: "20px", margin: "0" }}>
          {[
            "Personnaliser les offres d'emploi selon votre profil",
            "Générer des lettres de motivation adaptées à votre CV",
            "Calculer des scores de compatibilité avec les offres",
            "Permettre la communication entre utilisateurs",
            "Suivre vos candidatures",
          ].map((item, i) => <li key={i} style={li}>• {item}</li>)}
        </ul>
      </div>

      <div style={section}>
        <h2 style={h2}>4. Stockage et sécurité</h2>
        <p style={p}>Vos données sont stockées dans une base de données Redis hébergée par Upstash (infrastructure sécurisée, chiffrée au repos et en transit). Aucune donnée n'est vendue ou partagée avec des tiers à des fins commerciales.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>5. Services tiers</h2>
        <ul style={{ paddingLeft: "20px", margin: "0" }}>
          {[
            "Google OAuth — authentification (politique Google)",
            "Google Gemini API — analyse IA de vos offres et CV",
            "SerpAPI — récupération des offres d'emploi",
            "France Travail API — offres d'emploi françaises",
            "Vercel — hébergement de l'application",
          ].map((item, i) => <li key={i} style={li}>• {item}</li>)}
        </ul>
      </div>

      <div style={section}>
        <h2 style={h2}>6. Vos droits (RGPD)</h2>
        <p style={p}>Conformément au RGPD, vous disposez des droits suivants :</p>
        <ul style={{ paddingLeft: "20px", margin: "0 0 12px" }}>
          {[
            "Droit d'accès à vos données",
            "Droit de rectification",
            "Droit à l'effacement (\"droit à l'oubli\")",
            "Droit à la portabilité",
            "Droit d'opposition au traitement",
          ].map((item, i) => <li key={i} style={li}>• {item}</li>)}
        </ul>
        <p style={p}>Vous pouvez exercer votre <strong style={{ color: "var(--text-primary)" }}>droit à l'effacement</strong> directement depuis la page Profil → "Supprimer mon compte". Cette action supprime immédiatement et définitivement toutes vos données.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>7. Durée de conservation</h2>
        <p style={p}>Vos données sont conservées tant que votre compte est actif. Elles sont supprimées immédiatement et définitivement lors de la suppression de votre compte.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>8. Contact</h2>
        <p style={p}>Pour toute question relative à vos données personnelles, contactez-nous via la page Amis ou en envoyant un message direct sur la plateforme.</p>
      </div>
    </main>
  );
}
