/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // habilita instrumentation.ts (fuso horário do servidor)
    instrumentationHook: true,
    // Não reaproveitar páginas dinâmicas do cache do cliente ao navegar/voltar:
    // sempre buscar dados frescos. Evita "cliquei, voltei e não atualizou"
    // (o padrão do Next segurava a página por ~30s).
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
};

export default nextConfig;
