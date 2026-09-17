import { ImageResponse } from "next/og";

// Ícone da tela inicial no iPhone/iPad (a Apple arredonda os cantos sozinha).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontSize: 46,
          fontWeight: 700,
          letterSpacing: -2,
          fontFamily: "sans-serif",
        }}
      >
        favie
      </div>
    ),
    { ...size },
  );
}
