import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types";

/**
 * Cliente Supabase para uso em Server Components, Route Handlers e
 * Server Actions. Lê/grava a sessão a partir dos cookies da requisição.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // O método setAll pode ser chamado a partir de um Server Component.
            // Isso é seguro de ignorar quando há um middleware atualizando a sessão.
          }
        },
      },
    },
  );
}
