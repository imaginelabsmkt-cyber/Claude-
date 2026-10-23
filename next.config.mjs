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
    // Cache curto de navegação no cliente: clicar e voltar fica instantâneo
    // (reaproveita a página por alguns segundos) sem perder a atualização, já
    // que toda edição chama router.refresh() e revalida a tela na hora. Antes
    // estava em 0 (sempre buscava do servidor), o que deixava tudo lento.
    staleTimes: {
      dynamic: 20,
      static: 180,
    },
  },
};

export default nextConfig;
