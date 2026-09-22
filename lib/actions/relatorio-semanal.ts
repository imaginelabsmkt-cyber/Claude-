"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";

export interface NotaResult {
  ok: boolean;
  error?: string;
}

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Salva o recado/relatório da semana (o "nosso lado") de um cliente. Uma linha
 * por cliente/semana (segunda-feira). Aparece no painel do cliente.
 */
export async function salvarNotaSemanalAction(
  clientId: string,
  weekStart: string,
  note: string,
): Promise<NotaResult> {
  if (!clientId || !DATA_RE.test(weekStart)) {
    return { ok: false, error: "Dados inválidos." };
  }
  const userId = await usuarioAtualId();
  if (!userId) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const supabase = createClient();
  const { error } = await supabase.from("client_weekly_notes").upsert(
    {
      client_id: clientId,
      week_start: weekStart,
      note: note.trim().slice(0, 4000) || null,
      created_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id,week_start" },
  );
  if (error) return { ok: false, error: "Não foi possível salvar." };

  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}
