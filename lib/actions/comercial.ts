"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dadosDoFechamento, propostaVigente } from "@/lib/comercial/funil";
import { paraNumero } from "@/lib/financeiro/valores";
import {
  fechamentoSchema,
  leadFormSchema,
  propostaFormSchema,
  type FechamentoValues,
  type LeadFormValues,
  type PropostaFormValues,
} from "@/lib/validation/comercial";
import type { LeadStage, Proposal } from "@/types";

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

function revalidarComercial() {
  revalidatePath("/interno/comercial");
  revalidatePath("/interno/comercial/funil");
  revalidatePath("/interno");
}

/** Fechar um negócio mexe no financeiro também. */
function revalidarTudo() {
  revalidarComercial();
  revalidatePath("/interno/financeiro");
  revalidatePath("/interno/financeiro/recorrencias");
  revalidatePath("/interno/financeiro/lancamentos");
  revalidatePath("/clientes");
}

// -------------------------------------------------------------
// Oportunidades
// -------------------------------------------------------------

function normalizarLead(values: LeadFormValues) {
  return {
    name: values.name.trim(),
    contact_name: limpar(values.contact_name),
    contact_email: limpar(values.contact_email),
    contact_phone: limpar(values.contact_phone),
    source: limpar(values.source),
    stage: values.stage,
    estimated_monthly: paraNumero(values.estimated_monthly ?? "") ?? 0,
    notes: limpar(values.notes),
  };
}

/** Cria uma oportunidade no funil. */
export async function criarLeadAction(
  input: LeadFormValues,
): Promise<ActionResult> {
  const parsed = leadFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("commercial_leads")
    .insert(normalizarLead(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "Não foi possível salvar a oportunidade." };
  }

  revalidarComercial();
  return { ok: true, id: data.id };
}

/** Atualiza uma oportunidade. */
export async function atualizarLeadAction(
  id: string,
  input: LeadFormValues,
): Promise<ActionResult> {
  const parsed = leadFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("commercial_leads")
    .update(normalizarLead(parsed.data))
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível atualizar." };

  revalidarComercial();
  return { ok: true, id };
}

/**
 * Move a oportunidade de etapa (o arrasto no quadro).
 *
 * Só move entre etapas ABERTAS: ganhar exige os dados do contrato
 * (`fecharNegocioAction`) e perder exige um motivo (`perderNegocioAction`).
 */
export async function moverEtapaAction(
  id: string,
  etapa: LeadStage,
): Promise<ActionResult> {
  if (etapa === "Fechado" || etapa === "Perdido") {
    return {
      ok: false,
      error: "Para encerrar, use Ganhar ou Perder — o fechamento pede mais dados.",
    };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("commercial_leads")
    .update({ stage: etapa })
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível mover a oportunidade." };

  revalidarComercial();
  return { ok: true, id };
}

/** Marca a oportunidade como perdida, com o motivo. */
export async function perderNegocioAction(
  id: string,
  motivo: string,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("commercial_leads")
    .update({ stage: "Perdido", lost_reason: limpar(motivo) })
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível encerrar." };

  revalidarComercial();
  return { ok: true, id };
}

/** Devolve uma oportunidade encerrada ao funil. */
export async function reabrirLeadAction(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("commercial_leads")
    .update({ stage: "Negociação", lost_reason: null })
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível reabrir." };

  revalidarComercial();
  return { ok: true, id };
}

/** Exclui uma oportunidade (as propostas dela vão junto). */
export async function excluirLeadAction(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("commercial_leads").delete().eq("id", id);
  if (error) return { ok: false, error: "Não foi possível excluir." };
  revalidarComercial();
  return { ok: true };
}

// -------------------------------------------------------------
// Propostas
// -------------------------------------------------------------

function normalizarProposta(values: PropostaFormValues) {
  const meta = values.monthly_goal?.trim();
  return {
    status: values.status,
    monthly_amount: paraNumero(values.monthly_amount) ?? 0,
    setup_amount: paraNumero(values.setup_amount ?? "") ?? 0,
    monthly_goal: meta ? Number(meta) : null,
    scope: limpar(values.scope),
    sent_at: limpar(values.sent_at),
    valid_until: limpar(values.valid_until),
    notes: limpar(values.notes),
  };
}

/** Cria uma proposta para uma oportunidade. */
export async function criarPropostaAction(
  leadId: string,
  input: PropostaFormValues,
): Promise<ActionResult> {
  const parsed = propostaFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("commercial_proposals")
    .insert({ lead_id: leadId, ...normalizarProposta(parsed.data) })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "Não foi possível salvar a proposta." };
  }

  // Enviar uma proposta move a oportunidade para a etapa correspondente,
  // se ela ainda estiver atrás — assim o quadro não fica desatualizado.
  if (parsed.data.status === "Enviada") {
    const { data: lead } = await supabase
      .from("commercial_leads")
      .select("stage")
      .eq("id", leadId)
      .maybeSingle();

    if (lead?.stage === "Contato feito" || lead?.stage === "Diagnóstico") {
      await supabase
        .from("commercial_leads")
        .update({ stage: "Proposta enviada" })
        .eq("id", leadId);
    }
  }

  revalidarComercial();
  return { ok: true, id: data.id };
}

/** Atualiza uma proposta. */
export async function atualizarPropostaAction(
  id: string,
  input: PropostaFormValues,
): Promise<ActionResult> {
  const parsed = propostaFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("commercial_proposals")
    .update(normalizarProposta(parsed.data))
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível atualizar a proposta." };

  revalidarComercial();
  return { ok: true, id };
}

/** Exclui uma proposta. */
export async function excluirPropostaAction(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("commercial_proposals").delete().eq("id", id);
  if (error) return { ok: false, error: "Não foi possível excluir a proposta." };
  revalidarComercial();
  return { ok: true };
}

// -------------------------------------------------------------
// Fechar o negócio — o ponto em que comercial vira financeiro
// -------------------------------------------------------------

export interface FechamentoResult extends ActionResult {
  clienteId?: string;
  /** Resumo do que foi criado, para a mensagem de sucesso. */
  criou?: { cliente: string; mensal: number; ate: string | null; setup: boolean };
}

/**
 * Ganha a oportunidade e cria, de uma vez:
 *
 *   1. o CLIENTE (que já vale também para o sistema de demandas);
 *   2. a MENSALIDADE nas recorrências do financeiro, com vigência;
 *   3. o lançamento de ENTRADA/SETUP, se a proposta cobrava.
 *
 * É o ciclo que a planilha nunca fez: um clique aqui e a mensalidade
 * passa a ser gerada todo mês pelo "Gerar do plano fixo", e a data de
 * fim da vigência vira o alerta de renovação no Início.
 *
 * Se o cliente já existir com o mesmo nome, reaproveita em vez de
 * duplicar — é comum ganhar de volta um cliente que tinha saído.
 */
export async function fecharNegocioAction(
  leadId: string,
  input: FechamentoValues,
): Promise<FechamentoResult> {
  const parsed = fechamentoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();

  const { data: lead } = await supabase
    .from("commercial_leads")
    .select("*, proposals:commercial_proposals(*)")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return { ok: false, error: "Oportunidade não encontrada." };

  const propostas = ((lead.proposals ?? []) as Proposal[]).map((p) => ({
    ...p,
    monthly_amount: Number(p.monthly_amount),
    setup_amount: Number(p.setup_amount),
  }));

  const dados = dadosDoFechamento(
    { ...lead, estimated_monthly: Number(lead.estimated_monthly) },
    propostaVigente(propostas),
    {
      mesInicio: parsed.data.mesInicio,
      meses: parsed.data.meses ? Number(parsed.data.meses) : 0,
      diaVencimento: parsed.data.diaVencimento
        ? Number(parsed.data.diaVencimento)
        : null,
    },
  );

  // 1. Cliente — reaproveita se já existir com o mesmo nome.
  const { data: existente } = await supabase
    .from("clients")
    .select("id")
    .eq("name", dados.cliente.name)
    .maybeSingle();

  let clienteId = existente?.id ?? null;

  if (clienteId) {
    await supabase.from("clients").update({ active: true }).eq("id", clienteId);
  } else {
    const { data: novo, error: erroCliente } = await supabase
      .from("clients")
      .insert(dados.cliente)
      .select("id")
      .single();
    if (erroCliente || !novo) {
      return { ok: false, error: "Não foi possível criar o cliente." };
    }
    clienteId = novo.id;
  }

  // 2. Categoria da mensalidade no financeiro.
  const { data: categoria } = await supabase
    .from("financial_categories")
    .select("id")
    .eq("kind", "Receita")
    .eq("name", "Mensalidades / clientes recorrentes")
    .maybeSingle();

  if (!categoria) {
    return {
      ok: false,
      error:
        'Categoria "Mensalidades / clientes recorrentes" não encontrada no financeiro.',
    };
  }

  // 3. A mensalidade recorrente — o "contrato".
  const { error: erroRecorrencia } = await supabase
    .from("financial_recurrences")
    .insert({
      description: dados.recorrencia.description,
      kind: "Receita" as const,
      category_id: categoria.id,
      client_id: clienteId,
      amount: dados.recorrencia.amount,
      due_day: dados.recorrencia.due_day,
      start_month: dados.recorrencia.start_month,
      end_month: dados.recorrencia.end_month,
      active: true,
    });

  if (erroRecorrencia) {
    return { ok: false, error: "Cliente criado, mas a mensalidade falhou." };
  }

  // 4. Entrada/setup, quando houver.
  if (dados.setup) {
    const { data: avulsos } = await supabase
      .from("financial_categories")
      .select("id")
      .eq("kind", "Receita")
      .eq("name", "Projetos avulsos")
      .maybeSingle();

    if (avulsos) {
      await supabase.from("financial_entries").insert({
        reference_month: dados.setup.reference_month,
        kind: "Receita" as const,
        category_id: avulsos.id,
        client_id: clienteId,
        description: dados.setup.description,
        amount: dados.setup.amount,
        status: "Pendente" as const,
      });
    }
  }

  // 5. Encerra a oportunidade apontando para o cliente que nasceu dela.
  await supabase
    .from("commercial_leads")
    .update({ stage: "Fechado", client_id: clienteId })
    .eq("id", leadId);

  // 6. A proposta vigente passa a Aceita.
  const vigente = propostaVigente(propostas);
  if (vigente && vigente.status !== "Aceita") {
    await supabase
      .from("commercial_proposals")
      .update({ status: "Aceita" })
      .eq("id", vigente.id);
  }

  revalidarTudo();
  return {
    ok: true,
    id: leadId,
    clienteId: clienteId ?? undefined,
    criou: {
      cliente: dados.cliente.name,
      mensal: dados.recorrencia.amount,
      ate: dados.recorrencia.end_month,
      setup: Boolean(dados.setup),
    },
  };
}
