import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agência Social — Gestão de Conteúdo",
  description:
    "Sistema de gestão de produção de conteúdo para agência de social media.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
