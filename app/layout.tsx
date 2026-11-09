import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // O título da aba do navegador é o que diferencia este sistema do de
  // demandas, que vive no mesmo navegador. Cada tela põe o próprio
  // nome no lugar do %s, então a aba diz onde você está.
  title: {
    default: "Favie · Financeiro",
    template: "%s · Favie",
  },
  description:
    "Sistema financeiro e administrativo da Favie.",
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
