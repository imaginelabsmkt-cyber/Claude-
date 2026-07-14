"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Observa mudanças na sessão do Supabase no cliente. Se a sessão expirar
 * ou o usuário sair (em outra aba), redireciona para /login.
 *
 * Complementa a proteção do middleware, cobrindo o caso de sessão que
 * expira enquanto a página já está aberta.
 */
export function SessionWatcher() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (evento === "SIGNED_OUT" || (!sessao && evento !== "INITIAL_SESSION")) {
        router.replace("/login");
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
