import { type NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await atualizarSessao(request);
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware a todas as rotas, exceto:
     * - _next/static, _next/image (assets internos do Next)
     * - favicon.ico e arquivos estáticos comuns
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
