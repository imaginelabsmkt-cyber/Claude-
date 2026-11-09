/**
 * Leitura dos contratos de cliente.
 *
 * O contrato é a entidade; a recorrência financeira é a cobrança que
 * ele gera. Quem manda no valor é o contrato.
 */

import { createClient } from "@/lib/supabase/server";
import type { Client, ClientContract } from "@/types";

export interface ContratoComCliente extends ClientContract {
  client: Client | null;
}

/** Todos os contratos, do mais recente para o mais antigo. */
export async function listarContratosDeCliente(): Promise<ContratoComCliente[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("client_contracts")
    .select("*, client:clients(*)")
    .order("status")
    .order("start_date", { ascending: false });

  return ((data ?? []) as unknown as ContratoComCliente[]).map((c) => ({
    ...c,
    monthly_amount: Number(c.monthly_amount),
  }));
}

/** Um contrato, para edição. */
export async function obterContratoDeCliente(
  id: string,
): Promise<ContratoComCliente | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("client_contracts")
    .select("*, client:clients(*)")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  const c = data as unknown as ContratoComCliente;
  return { ...c, monthly_amount: Number(c.monthly_amount) };
}
