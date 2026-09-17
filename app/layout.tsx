import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "favie · Gestão de Demandas",
  description:
    "Sistema de gestão de produção de conteúdo para agência de social media.",
  // Abre em modo app quando adicionado à tela inicial do iPhone.
  // "default": o conteúdo começa ABAIXO da barra de status (relógio/bateria),
  // então o botão de menu no topo não fica escondido sob o relógio e dá pra
  // tocar normalmente. (black-translucent jogava o app pra baixo do relógio.)
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "favie",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Cor da barra de status/aba no celular (vinho da marca).
  themeColor: "#6a2336",
  // Usa a tela toda em telas com notch quando instalado.
  viewportFit: "cover",
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
