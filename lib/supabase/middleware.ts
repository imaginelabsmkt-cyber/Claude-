import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Renova a sessão do Supabase a cada requisição.
 * Chamado pelo middleware.ts na raiz do projeto.
 *
 * NESTA ETAPA (base técnica): apenas mantém a estrutura preparada para o
 * Supabase e renova os cookies de sessão de forma segura. A PROTEÇÃO DE
 * ROTAS (redirecionar não autenticados para /login) será habilitada na
 * etapa de autenticação — por isso ainda não há bloqueio de navegação.
 *
 * Enquanto as variáveis de ambiente não estiverem configuradas, a função
 * degrada com segurança (não quebra o dev server).
 */
export async function atualizarSessao(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sem credenciais configuradas, não há sessão a renovar. Segue o fluxo.
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

  // Renova a sessão (refresh dos tokens). Ainda sem redirecionamento.
  try {
    await supabase.auth.getUser();
  } catch {
    // Ambiente sem Supabase acessível: ignora e segue o fluxo.
  }

  // TODO (Etapa de autenticação): habilitar proteção de rotas —
  // redirecionar usuário não autenticado para /login e autenticado
  // para fora de /login.

  return response;
}
