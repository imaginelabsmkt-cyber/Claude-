import { createClient } from "@/lib/supabase/server";
import { escaparLike } from "@/lib/utils";
import type { AreaId } from "@/lib/interno/areas";

/** Um resultado de busca, já sabendo para onde levar e de que área é. */
export interface ResultadoBusca {
  id: string;
  /** Área de origem — dá a cor da linha. */
  origem: AreaId;
  /** O que é ("Cliente", "Lançamento", "Oportunidade"...). */
  tipo: string;
  titulo: string;
  detalhe: string;
  href: string;
}

/** Quantos resultados de cada tipo. Poucos, porque a busca é para achar rápido. */
const POR_TIPO = 5;

/**
 * Busca em tudo que o sistema interno conhece.
 *
 * Roda seis consultas em paralelo e devolve agrupado. Não é busca
 * textual sofisticada — é `ilike` em nome/descrição, que é o suficiente
 * para uma base do tamanho da agência e não exige índice especial.
 */
export async function buscarTudo(termo: string): Promise<ResultadoBusca[]> {
  const limpo = termo.trim();
  if (limpo.length < 2) return [];

  const supabase = createClient();
  const alvo = `%${escaparLike(limpo)}%`;

  const [clientes, lancamentos, leads, pessoas, obrigacoes, documentos] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, name, active")
        .ilike("name", alvo)
        .order("active", { ascending: false })
        .limit(POR_TIPO),
      supabase
        .from("financial_entries")
        .select("id, description, amount, reference_month, kind, status")
        .ilike("description", alvo)
        .order("reference_month", { ascending: false })
        .limit(POR_TIPO),
      supabase
        .from("commercial_leads")
        .select("id, name, stage, estimated_monthly")
        .ilike("name", alvo)
        .limit(POR_TIPO),
      supabase
        .from("team_members")
        .select("id, name, kind, role, active")
        .ilike("name", alvo)
        .limit(POR_TIPO),
      supabase
        .from("company_obligations")
        .select("id, title, area, cadence")
        .ilike("title", alvo)
        .eq("active", true)
        .limit(POR_TIPO),
      supabase
        .from("company_files")
        .select("id, name, kind")
        .ilike("name", alvo)
        .limit(POR_TIPO),
    ]);

  const moeda = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const saida: ResultadoBusca[] = [];

  for (const c of clientes.data ?? []) {
    saida.push({
      id: `cliente-${c.id}`,
      origem: "comercial",
      tipo: "Cliente",
      titulo: c.name,
      detalhe: c.active ? "ativo" : "inativo",
      href: `/clientes/${c.id}`,
    });
  }

  for (const l of lancamentos.data ?? []) {
    saida.push({
      id: `lancamento-${l.id}`,
      origem: "financeiro",
      tipo: "Lançamento",
      titulo: l.description,
      detalhe: `${l.kind === "Receita" ? "+" : "−"} ${moeda(Number(l.amount))} · ${l.reference_month} · ${l.status}`,
      href: `/interno/financeiro/lancamentos/${l.id}/editar`,
    });
  }

  for (const l of leads.data ?? []) {
    saida.push({
      id: `lead-${l.id}`,
      origem: "comercial",
      tipo: "Oportunidade",
      titulo: l.name,
      detalhe: `${l.stage} · ${moeda(Number(l.estimated_monthly))}/mês`,
      href: `/interno/comercial/${l.id}`,
    });
  }

  for (const p of pessoas.data ?? []) {
    saida.push({
      id: `pessoa-${p.id}`,
      origem: "pessoas",
      tipo: "Pessoa",
      titulo: p.name,
      detalhe: [p.kind, p.role, p.active ? null : "inativa"]
        .filter(Boolean)
        .join(" · "),
      href: "/interno/pessoas",
    });
  }

  for (const o of obrigacoes.data ?? []) {
    saida.push({
      id: `obrigacao-${o.id}`,
      origem: o.area === "administrativo" ? "administrativo" : "contabil",
      tipo: "Obrigação",
      titulo: o.title,
      detalhe: o.cadence,
      href: o.area === "administrativo" ? "/interno/administrativo" : "/interno/contabil",
    });
  }

  for (const d of documentos.data ?? []) {
    saida.push({
      id: `documento-${d.id}`,
      origem: "administrativo",
      tipo: "Documento",
      titulo: d.name,
      detalhe: d.kind,
      href: "/interno/administrativo",
    });
  }

  return saida;
}
