import { NextResponse } from "next/server";
import { urlDeConsentimento, googleConfigurado } from "@/lib/google/oauth";

/** Inicia a conexão com o Google: leva o usuário à tela de consentimento. */
export async function GET(request: Request) {
  if (!googleConfigurado()) {
    return NextResponse.redirect(
      new URL("/configuracoes?google=naoconfig", request.url),
    );
  }
  const origem = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(urlDeConsentimento(origem, state));
  res.cookies.set("g_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
