import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Rotas públicas (acessíveis sem autenticação). */
const ROTAS_PUBLICAS = ["/login"];

/**
 * Renova a sessão do Supabase e protege as rotas internas.
 * Chamado pelo middleware.ts na raiz do projeto.
 *
 * Regras:
 * - Usuário não autenticado em rota protegida -> redireciona para /login.
 * - Usuário autenticado acessando /login -> redireciona para /dashboard.
 *
 * Sem variáveis de ambiente configuradas, degrada com segurança (não
 * bloqueia navegação) para não quebrar preview/build.
 */
export async function atualizarSessao(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sem credenciais: não há como autenticar; segue o fluxo sem bloquear.
  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }[],
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() valida o token e renova a sessão. Com TEMPO-LIMITE: se o Supabase
  // demorar (ex.: projeto "dormindo"), o middleware NÃO pendura o site inteiro
  // com um 504 — degrada em segurança e deixa passar (a página revalida a
  // sessão do seu jeito).
  const rota = request.nextUrl.pathname;
  const ehPublica = ROTAS_PUBLICAS.includes(rota);

  let user: { id: string } | null = null;
  try {
    const resultado = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 3000),
      ),
    ]);
    user = resultado.data.user;
  } catch {
    // Supabase lento/indisponível: não bloqueia a navegação (evita o 504).
    return response;
  }

  // Não autenticado tentando acessar rota protegida -> login.
  if (!user && !ehPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Autenticado acessando a tela de login -> dashboard.
  if (user && rota === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
