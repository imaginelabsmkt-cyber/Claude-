import { ImageResponse } from "next/og";

// Ícone do app (PNG) para o manifest / instalação na tela inicial (Android).
// Tamanho via ?size=192|512. O texto fica centralizado (dentro da "safe zone"),
// então serve tanto como ícone normal quanto "maskable".
export function GET(req: Request) {
  const pedido = Number(new URL(req.url).searchParams.get("size") ?? 512);
  const size = Number.isFinite(pedido)
    ? Math.min(Math.max(pedido, 48), 512)
    : 512;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#6a2336",
          color: "#fff1c7",
          fontSize: Math.round(size * 0.26),
          fontWeight: 700,
          letterSpacing: -Math.round(size * 0.012),
          fontFamily: "sans-serif",
        }}
      >
        favie
      </div>
    ),
    { width: size, height: size },
  );
}
