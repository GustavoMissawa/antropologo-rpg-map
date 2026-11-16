import type { Metadata } from "next";
import "./globals.css";
import "./appearance.css";
import "./player-space.css";
import "./sheet-map.css";
import "./readability.css";
import "./sheet-mechanics.css";
import "./sheet-play.css";
import "./sheet-enhancements.css";
import "./sheet-comparison.css";
import "./rules-library.css";
import "./platform-brand.css";
import "./rule-editor.css";
import "./rulebook-sheet.css";
import "./home-dice-background.css";
import "./sheet-visual.css";
import "./content-files.css";
import "./dice-resolution.css";
import "./system-editor.css";
import "./system-identity.css";
import "./system-visual-editor.css";
import "./ui-polish.css";
import "./platform-discovery.css";
import "./platform-finish.css";
import "./platform-navigation.css";
import "./rules-reader.css";
import { appearanceBootstrap, paletteCSS } from '../lib/appearance';

export const metadata: Metadata = {
  title: "ANTROPOLOGO RPG",
  description: "Uma plataforma para diferentes sistemas de RPG. Consulte o AB10, crie suas regras e organize fichas, PDFs e sessões.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head><style>{paletteCSS}</style><script dangerouslySetInnerHTML={{__html:appearanceBootstrap}}/><noscript><link rel="icon" href="/favicon.svg"/></noscript></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
