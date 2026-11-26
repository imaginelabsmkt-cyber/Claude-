"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { paraNumero } from "@/lib/financeiro/valores";

/**
 * O que a tela de Metas grava.
 *
 * Só palpite: premissas, contratações e o ritmo de entrada. A
 * carteira, o faturamento e as contas fixas não se editam aqui,
 * cada um tem a tela dele, e dois lugares para o mesmo número é
 * como se perde a conta.
 */

export interface ResultadoDaMeta {
  ok: boolean;
  error?: string;
}

function revalidar() {
  revalidatePath("/interno/financeiro/metas");
  revalidatePath("/interno/financeiro/estimativa");
}

const MES = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Uma premissa, pelo nome da coluna. */
const PREMISSAS_EDITAVEIS: Record<string, "numero" | "mes" | "percentual"> = {
  ticket_novo: "numero",
  videos_por_cliente: "numero",
  videos_do_editor: "numero",
  preco_por_video: "numero",
  imposto_fixo: "numero",
  contador_mensal: "numero",
  das_do_mei: "numero",
  imposto_percentual: "percentual",
  custo_saida_do_mei: "numero",
  mes_saida_do_mei: "mes",
  encargos_clt: "percentual",
  guardar_por_mes: "numero",
  meta_guardada: "numero",
  mes_da_meta: "mes",
  clientes_na_projecao: "numero",
};

export async function salvarPremissaAction(
  campo: string,
  valor: string,
): Promise<ResultadoDaMeta> {
  const tipo = PREMISSAS_EDITAVEIS[campo];
  if (!tipo) return { ok: false, error: "Essa premissa não existe." };

  let v: string | number;
  if (tipo === "mes") {
    if (!MES.test(valor)) return { ok: false, error: "Use o formato AAAA-MM." };
    v = valor;
  } else {
    const n = paraNumero(valor);
    if (n == null || n < 0) return { ok: false, error: "Valor inválido." };
    /* Percentual entra como "40" e vira 0,40: ninguém digita 0,4
       quando o rótulo diz "encargos CLT (%)". */
    v = tipo === "percentual" ? (n > 1 ? n / 100 : n) : n;
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("growth_assumptions" as never)
    .update({ [campo]: v, updated_at: new Date().toISOString() } as never)
    .eq("id", true);

  if (error) return { ok: false, error: "Não foi possível salvar." };
  revalidar();
  return { ok: true };
}

export async function salvarContratacaoAction(
  id: string,
  campos: {
    custoMensal?: string | null;
    mesDeInicio?: string;
    ativa?: boolean;
    clt?: boolean;
  },
): Promise<ResultadoDaMeta> {
  const mudanca: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (campos.custoMensal !== undefined) {
    const t = (campos.custoMensal ?? "").trim();
    /* Em branco volta a ser "falta definir", e NÃO vira zero: a tela
       precisa continuar avisando que a projeção está otimista. */
    if (t === "") mudanca.monthly_cost = null;
    else {
      const n = paraNumero(t);
      if (n == null || n < 0) return { ok: false, error: "Valor inválido." };
      mudanca.monthly_cost = n;
    }
  }

  if (campos.mesDeInicio !== undefined) {
    if (!MES.test(campos.mesDeInicio)) {
      return { ok: false, error: "Use o formato AAAA-MM." };
    }
    mudanca.start_month = campos.mesDeInicio;
  }

  if (campos.ativa !== undefined) mudanca.active = campos.ativa;
  if (campos.clt !== undefined) mudanca.clt = campos.clt;

  const supabase = createClient();
  const { error } = await supabase
    .from("growth_hires" as never)
    .update(mudanca as never)
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível salvar." };
  revalidar();
  return { ok: true };
}

/** Quantos clientes novos entram num mês. */
export async function salvarRitmoAction(
  mes: string,
  quantos: string,
): Promise<ResultadoDaMeta> {
  if (!MES.test(mes)) return { ok: false, error: "Mês inválido." };

  const n = paraNumero(quantos);
  if (n == null || n < 0) return { ok: false, error: "Valor inválido." };

  const supabase = createClient();
  const { error } = await supabase
    .from("growth_months" as never)
    .upsert(
      {
        reference_month: mes,
        novos_clientes: Math.round(n),
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "reference_month" },
    );

  if (error) return { ok: false, error: "Não foi possível salvar." };
  revalidar();
  return { ok: true };
}

/** Uma contratação nova. */
export async function criarContratacaoAction(
  cargo: string,
  mesDeInicio: string,
): Promise<ResultadoDaMeta> {
  const nome = cargo.trim();
  if (!nome) return { ok: false, error: "Dê um nome ao cargo." };
  if (!MES.test(mesDeInicio)) return { ok: false, error: "Use AAAA-MM." };

  const supabase = createClient();
  const { error } = await supabase.from("growth_hires" as never).insert({
    role: nome,
    pay_kind: "mensal",
    monthly_cost: null,
    start_month: mesDeInicio,
    active: true,
    clt: true,
  } as never);

  if (error) return { ok: false, error: "Não foi possível criar." };
  revalidar();
  return { ok: true };
}

export async function excluirContratacaoAction(
  id: string,
): Promise<ResultadoDaMeta> {
  const supabase = createClient();
  const { error } = await supabase
    .from("growth_hires" as never)
    .delete()
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível excluir." };
  revalidar();
  return { ok: true };
}
