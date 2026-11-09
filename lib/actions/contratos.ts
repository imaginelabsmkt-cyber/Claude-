"use server";

import { hojeISO } from "@/lib/financeiro/meses";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { paraNumero } from "@/lib/financeiro/valores";
import {
  contratoFormSchema,
  type ContratoFormValues,
} from "@/lib/validation/contratos";

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
}

function primeirosErros(
  fieldErrors: Record<string, string[] | undefined>,
): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const [campo, msgs] of Object.entries(fieldErrors)) {
    if (msgs && msgs.length > 0) saida[campo] = msgs[0];
  }
  return saida;
}

function limpar(v?: string | null): string | null {
  const t = v?.trim();
  return t ? t : null;
}

function revalidar() {
  revalidatePath("/interno/administrativo/clientes");
  revalidatePath("/interno");
}

function normalizar(v: ContratoFormValues) {
  return {
    client_id: v.client_id,
    status: v.status,
    monthly_amount: paraNumero(v.monthly_amount) ?? 0,
    scope: limpar(v.scope),
    start_date: v.start_date,
    end_date: limpar(v.end_date),
    readjust_index: limpar(v.readjust_index),
    last_readjust: limpar(v.last_readjust),
    signed_at: limpar(v.signed_at),
    notes: limpar(v.notes),
  };
}

export async function criarContratoAction(
  input: ContratoFormValues,
): Promise<ActionResult> {
  const parsed = contratoFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("client_contracts")
    .insert(normalizar(parsed.data))
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: "Não foi possível salvar." };

  revalidar();
  return { ok: true, id: data.id };
}

export async function atualizarContratoAction(
  id: string,
  input: ContratoFormValues,
): Promise<ActionResult> {
  const parsed = contratoFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const dados = normalizar(parsed.data);
  const { error } = await supabase
    .from("client_contracts")
    .update(dados)
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível salvar." };

  // O contrato manda no valor: se ele tem uma cobrança ligada no
  // financeiro, ela acompanha. Sem isto, mudar a mensalidade aqui
  // deixaria o financeiro cobrando o valor velho, calado.
  const { data: contrato } = await supabase
    .from("client_contracts")
    .select("recurrence_id")
    .eq("id", id)
    .maybeSingle();

  if (contrato?.recurrence_id) {
    await supabase
      .from("financial_recurrences")
      .update({
        amount: dados.monthly_amount,
        active: dados.status === "Ativo",
      })
      .eq("id", contrato.recurrence_id);
    revalidatePath("/interno/financeiro/recorrencias");
  }

  revalidar();
  return { ok: true, id };
}

export async function excluirContratoAction(
  id: string,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("client_contracts")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível excluir." };

  revalidar();
  return { ok: true };
}

/**
 * Registra que o contrato foi reajustado hoje, com o valor novo.
 *
 * Existe como ação própria porque reajustar é um ato, não uma edição:
 * muda o valor E zera o relógio do próximo reajuste. Fazer isso na
 * mão, pelo formulário, é o tipo de coisa que se esquece pela metade.
 */
export async function registrarReajusteAction(
  id: string,
  novoValor: string,
): Promise<ActionResult> {
  const valor = paraNumero(novoValor);
  if (valor === null || valor < 0) {
    return { ok: false, error: "Valor inválido." };
  }

  const supabase = createClient();
  const hoje = hojeISO();

  const { error } = await supabase
    .from("client_contracts")
    .update({ monthly_amount: valor, last_readjust: hoje })
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível registrar." };

  const { data: contrato } = await supabase
    .from("client_contracts")
    .select("recurrence_id")
    .eq("id", id)
    .maybeSingle();

  if (contrato?.recurrence_id) {
    await supabase
      .from("financial_recurrences")
      .update({ amount: valor })
      .eq("id", contrato.recurrence_id);
    revalidatePath("/interno/financeiro/recorrencias");
  }

  revalidar();
  return { ok: true, id };
}
