import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // O título da aba do navegador é o que diferencia este sistema do de
  // demandas, que vive no mesmo navegador.
  //
  // "ADM" vem PRIMEIRO de propósito: a aba corta o texto no fim, não no
  // começo, então o que identifica o sistema precisa ser a primeira
  // palavra. Com a aba estreita ela lê "ADM..."; com espaço, lê
  // "ADM · Lançamentos" e sabe também em que tela está.
  title: {
    default: "ADM · Favie",
    template: "ADM · %s",
  },
  description: "Sistema financeiro e administrativo da Favie.",
  icons: {
    icon: [{ url: "/icone-favie-financeiro.svg", type: "image/svg+xml" }],
  },
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
