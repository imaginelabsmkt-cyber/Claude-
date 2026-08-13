"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";

export interface SalvarResult {
  ok: boolean;
  error?: string;
}

/**
 * Salva (upsert) o DNA/onboarding do cliente. Recebe o mapa completo
 * campo->valor. Só o texto do formulário — nada de arquivos.
 */
export async function salvarOnboardingAction(
  clientId: string,
  data: Record<string, string>,
): Promise<SalvarResult> {
  if (!clientId) return { ok: false, error: "Cliente inválido." };
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }

  // Limpa campos vazios e limita o tamanho de cada resposta.
  const limpo: Record<string, string> = {};
  for (const [k, v] of Object.entries(data ?? {})) {
    const val = (v ?? "").toString().trim();
    if (val) limpo[k] = val.slice(0, 4000);
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("client_onboarding")
    .upsert(
      { client_id: clientId, data: limpo },
      { onConflict: "client_id" },
    );

  if (error) return { ok: false, error: "Não foi possível salvar o onboard." };

  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}
