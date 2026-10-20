/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // habilita instrumentation.ts (fuso horário do servidor)
    instrumentationHook: true,
    // Server Actions têm limite padrão de 1 MB no corpo da requisição. O
    // planejamento (.docx do Word) passa fácil de 1 MB, então o upload falhava
    // com erro genérico. Sobe pra 12 MB (o parser já barra docx acima de 8 MB).
    serverActions: {
      bodySizeLimit: "12mb",
    },
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
