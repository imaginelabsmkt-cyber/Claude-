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
    } = supabase.auth.onAuthStateChange((evento) => {
      // Só redireciona quando o usuário REALMENTE saiu. No celular, ao trocar
      // de app e voltar, o Supabase dispara eventos (TOKEN_REFRESHED, etc.) que
      // podem vir sem sessão por um instante — reagir a isso jogava a pessoa pro
      // login sem motivo ("clico e volta"). O middleware cobre sessão expirada
      // na próxima navegação.
      if (evento === "SIGNED_OUT") {
        router.replace("/login");
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
