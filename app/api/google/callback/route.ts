import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  trocarCodePorTokens,
  emailDaConta,
} from "@/lib/google/oauth";

/** Recebe o retorno do Google, guarda o refresh token do usuário logado. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const salvo = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)g_state=([^;]+)/)?.[1];

  const erro = (motivo: string) =>
    NextResponse.redirect(new URL(`/configuracoes?google=${motivo}`, request.url));

  if (!code || !state || !salvo || state !== salvo) {
    return erro("erro");
  }

  try {
    // Confirma a sessão ANTES de trocar o code (evita concessão órfã).
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL("/login", request.url));

    const origem =
      process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
    const tokens = await trocarCodePorTokens(code, origem);
    if (!tokens.refresh_token) {
      // Sem refresh token: o usuário já havia autorizado antes. Peça para
      // remover o acesso em myaccount.google.com e conectar de novo.
      return erro("semrefresh");
    }

    const email = await emailDaConta(tokens.access_token);

    const { error } = await supabase.from("google_accounts").upsert({
      user_id: user.id,
      email,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) return erro("erro");

    const res = erro("ok");
    res.cookies.set("g_state", "", { path: "/", maxAge: 0 });
    return res;
  } catch {
    return erro("erro");
  }
}
