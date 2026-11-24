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

/**
 * Tira um cliente da relação, sem apagar nada.
 *
 * A Fran: "criar um botão 'Inativar cliente' em Administrativo >
 * Clientes, para os clientes sem contrato, para isso não precisar de
 * código da próxima vez."
 *
 * Inativar é diferente de excluir, e é de propósito: o histórico do
 * cliente — o que ele pagou, o que a gente produziu, por onde ele
 * chegou — continua inteiro. Ele só sai da carteira de hoje e passa
 * para "Clientes inativos". A conta do ano não muda.
 *
 * Só vale para quem NÃO tem contrato ativo. Inativar alguém com
 * contrato em pé seria desligar a cobrança por um caminho de
 * desvio: quem tem contrato se encerra pelo contrato.
 */
export async function inativarClienteAction(
  id: string,
): Promise<ActionResult> {
  const supabase = createClient();

  const { data: cliente } = await supabase
    .from("clients")
    .select("id, name, active")
    .eq("id", id)
    .maybeSingle();

  if (!cliente) return { ok: false, error: "Cliente não encontrado." };
  if (!cliente.active) return { ok: true, id };

  const { count } = await supabase
    .from("client_contracts")
    .select("id", { count: "exact", head: true })
    .eq("client_id", id);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error:
        "Este cliente tem contrato cadastrado. Encerre o contrato primeiro.",
    };
  }

  const { error } = await supabase
    .from("clients")
    .update({ active: false })
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível inativar." };

  /* As mensalidades dele param de gerar lançamento. Sem isso, o
     cliente sai da relação e a cobrança continua nascendo todo mês,
     que é pior do que não ter inativado. */
  await supabase
    .from("financial_recurrences")
    .update({ active: false })
    .eq("client_id", id)
    .eq("active", true);

  revalidar();
  revalidatePath("/interno/financeiro/recorrencias");
  revalidatePath("/interno/financeiro");
  return { ok: true, id };
}

/** Traz o cliente de volta para a relação. */
export async function reativarClienteAction(
  id: string,
): Promise<ActionResult> {
  const supabase = createClient();

  const { error } = await supabase
    .from("clients")
    .update({ active: true })
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível reativar." };

  /* As mensalidades NÃO voltam sozinhas: quem volta pode voltar com
     outro valor, e religar a cobrança antiga em silêncio seria
     cobrar errado. A recorrência se reativa em Contas fixas. */
  revalidar();
  return { ok: true, id };
}
