"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Atualiza o nome de exibição do próprio perfil (usuário autenticado).
 * O papel (role) e o e-mail não são editáveis por aqui.
 */
export async function atualizarPerfilAction(
  nome: string,
): Promise<ActionResult> {
  const valor = nome.trim();
  if (!valor) return { ok: false, error: "Informe seu nome." };
  if (valor.length > 120) return { ok: false, error: "Nome muito longo." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { error } = await supabase
    .from("profiles")
    .update({ name: valor })
    .eq("id", user.id);
  if (error) return { ok: false, error: "Não foi possível salvar." };

  revalidatePath("/configuracoes");
  revalidatePath("/", "layout");
  return { ok: true };
}
