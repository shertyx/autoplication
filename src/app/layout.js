import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { AppProvider } from "@/context/AppContext";
import PageTransition from "@/components/PageTransition";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import ConsentBanner from "@/components/ConsentBanner";

const geist = Geist({ subsets: ["latin"] });

export const metadata = {
  title: "Applify",
  description: "Ta plateforme de recherche d'emploi intelligente",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className={`${geist.className}`}>
        <SessionProviderWrapper>
          <AppProvider>
            <Navbar />
            <PageTransition>
              {children}
            </PageTransition>
            <ConsentBanner />
          </AppProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}