import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScriptaAI — Éditeur de documents",
  description: "Meilleur que Word. Plus simple qu'Overleaf. Boosté à l'IA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full" suppressHydrationWarning>
      <body className="h-full">{children}</body>
    </html>
  );
}
