"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";

export interface PortalResult {
  ok: boolean;
  error?: string;
  token?: string | null;
  enabled?: boolean;
}

/**
 * Liga/desliga o painel do cliente e garante um token (link secreto). Ao ligar
 * pela primeira vez, cria o token. Ao desligar, o link para de funcionar mas o
 * token é mantido (religar reusa o mesmo link).
 */
export async function configurarPortalAction(
  clientId: string,
  ativar: boolean,
): Promise<PortalResult> {
  if (!clientId) return { ok: false, error: "Cliente inválido." };
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  const supabase = createClient();

  const { data: atual } = await supabase
    .from("clients")
    .select("portal_token")
    .eq("id", clientId)
    .maybeSingle();

  const token = atual?.portal_token ?? (ativar ? randomUUID() : null);

  const { error } = await supabase
    .from("clients")
    .update({ portal_enabled: ativar, portal_token: token })
    .eq("id", clientId);
  if (error) return { ok: false, error: "Não foi possível salvar." };

  revalidatePath(`/clientes/${clientId}`);
  return { ok: true, token, enabled: ativar };
}

/**
 * Gera um NOVO token, invalida o link anterior (revoga o acesso de quem tinha
 * o link antigo). Mantém o painel ligado.
 */
export async function regenerarLinkPortalAction(
  clientId: string,
): Promise<PortalResult> {
  if (!clientId) return { ok: false, error: "Cliente inválido." };
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  const token = randomUUID();
  const supabase = createClient();
  const { error } = await supabase
    .from("clients")
    .update({ portal_token: token, portal_enabled: true })
    .eq("id", clientId);
  if (error) return { ok: false, error: "Não foi possível gerar o link." };

  revalidatePath(`/clientes/${clientId}`);
  return { ok: true, token, enabled: true };
}
