"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";
import type { ActionResult } from "@/lib/actions/contents";

/** Remove a conexão do usuário com o Google (e o mapeamento de sincronização). */
export async function desconectarGoogleAction(): Promise<ActionResult> {
  const userId = await usuarioAtualId();
  if (!userId) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const supabase = createClient();
  await supabase.from("google_sync").delete().eq("user_id", userId);
  const { error } = await supabase
    .from("google_accounts")
    .delete()
    .eq("user_id", userId);
  if (error) return { ok: false, error: "Não foi possível desconectar." };

  revalidatePath("/configuracoes");
  return { ok: true };
}
