import type { MetadataRoute } from "next";

/**
 * Manifest do app (PWA): permite "Adicionar à tela inicial" e abrir em modo
 * standalone (tela cheia, sem a barra do navegador), com cara de aplicativo.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "favie · Gestão de Demandas",
    short_name: "favie",
    description:
      "Gestão de produção de conteúdo, gravações e demandas da agência.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#6a2336",
    theme_color: "#6a2336",
    lang: "pt-BR",
    icons: [
      {
        src: "/appicon.png?size=192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/appicon.png?size=512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/appicon.png?size=512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
