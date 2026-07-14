"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** Adiciona um comentário ao conteúdo, como o usuário autenticado. */
export async function adicionarComentarioAction(
  contentId: string,
  texto: string,
): Promise<ActionResult> {
  const conteudo = texto.trim();
  if (!conteudo) return { ok: false, error: "Escreva um comentário." };
  if (conteudo.length > 2000) {
    return { ok: false, error: "Comentário muito longo (máx. 2000)." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { error } = await supabase.from("comments").insert({
    content_id: contentId,
    user_id: user.id,
    comment: conteudo,
  });
  if (error) return { ok: false, error: "Não foi possível comentar." };

  revalidatePath(`/conteudos/${contentId}`);
  return { ok: true };
}

/**
 * Exclui um comentário — apenas se pertencer ao usuário autenticado.
 * A cláusula user_id garante que ninguém exclua comentário de outra pessoa.
 */
export async function excluirComentarioAction(
  commentId: string,
  contentId: string,
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Não foi possível excluir." };

  revalidatePath(`/conteudos/${contentId}`);
  return { ok: true };
}
