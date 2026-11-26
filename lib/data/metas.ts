import { createClient } from "@/lib/supabase/server";
import type { Contratacao, Premissas } from "@/lib/metas/projecao";
import type { ContaFixa } from "@/lib/metas/custo-fixo";

/**
 * O que a projeção lê do banco.
 *
 * Só os PALPITES moram aqui: premissas, contratações e o ritmo de
 * entrada. A carteira, o faturamento e o custo fixo vêm das tabelas
 * que o sistema já tem, porque é lá que eles estão certos.
 */

const PADRAO: Premissas = {
  ticketNovo: 2000,
  videosPorCliente: 4,
  videosDoEditor: 50,
  precoPorVideo: 50,
  impostoFixo: 600,
  contadorMensal: 0,
  dasDoMei: 86.05,
  impostoPercentual: 0.06,
  custoSaidaDoMei: 2000,
  mesSaidaDoMei: "2027-01",
  encargosClt: 0.4,
  guardarPorMes: 8500,
  metaGuardada: 50000,
  mesDaMeta: "2027-06",
  clientesNaProjecao: 20,
};

/**
 * As premissas, ou os padrões quando a tabela ainda não existe.
 *
 * Devolver o padrão em vez de quebrar é de propósito: enquanto o
 * ATUALIZAR.sql não rodar no Supabase, a tela abre e mostra a conta
 * com os números da planilha, em vez de uma página de erro.
 */
export async function obterPremissas(): Promise<{
  premissas: Premissas;
  noBanco: boolean;
}> {
  const supabase = createClient();
  /* `as never` nos nomes de tabela: os tipos do Supabase são gerados
     a partir do schema e ainda não conhecem estas tabelas. Enquanto o
     ATUALIZAR.sql não rodar, elas de fato não existem, e é por isso
     que o erro aqui devolve os padrões em vez de quebrar a tela. */
  const { data, error } = await supabase
    .from("growth_assumptions" as never)
    .select("*")
    .maybeSingle();

  const linha = data as Record<string, unknown> | null;
  if (error || !linha) return { premissas: PADRAO, noBanco: false };

  return {
    noBanco: true,
    premissas: {
      ticketNovo: Number(linha.ticket_novo),
      videosPorCliente: Number(linha.videos_por_cliente),
      videosDoEditor: Number(linha.videos_do_editor),
      precoPorVideo: Number(linha.preco_por_video),
      impostoFixo: Number(linha.imposto_fixo),
      contadorMensal: Number(linha.contador_mensal),
      dasDoMei: Number(linha.das_do_mei),
      impostoPercentual: Number(linha.imposto_percentual),
      custoSaidaDoMei: Number(linha.custo_saida_do_mei),
      mesSaidaDoMei: linha.mes_saida_do_mei as string,
      encargosClt: Number(linha.encargos_clt),
      guardarPorMes: Number(linha.guardar_por_mes),
      metaGuardada: Number(linha.meta_guardada),
      mesDaMeta: linha.mes_da_meta as string,
      clientesNaProjecao: Number(linha.clientes_na_projecao),
    },
  };
}

export interface ContratacaoComNota extends Contratacao {
  nota: string | null;
}

export async function listarContratacoes(): Promise<ContratacaoComNota[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("growth_hires" as never)
    .select("*")
    .order("start_month")
    .order("role");

  return ((data ?? []) as unknown as Record<string, unknown>[]).map((h) => ({
    id: h.id as string,
    cargo: h.role as string,
    forma: h.pay_kind as Contratacao["forma"],
    custoMensal: h.monthly_cost == null ? null : Number(h.monthly_cost),
    mesDeInicio: h.start_month as string,
    ativa: Boolean(h.active),
    clt: Boolean(h.clt),
    nota: (h.notes as string | null) ?? null,
  }));
}

/** Quantos clientes novos entram em cada mês, por "YYYY-MM". */
export async function obterRitmo(): Promise<Record<string, number>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("growth_months" as never)
    .select("reference_month, novos_clientes");

  const r: Record<string, number> = {};
  for (const m of (data ?? []) as unknown as Record<string, unknown>[]) {
    r[m.reference_month as string] = Number(m.novos_clientes);
  }
  return r;
}

/** As contas fixas, com início e fim, para o custo fixo mês a mês. */
export async function listarContasFixasDaProjecao(): Promise<
  (ContaFixa & { description: string })[]
> {
  const supabase = createClient();
  const { data } = await supabase
    .from("financial_recurrences")
    .select("description, kind, amount, active, start_month, end_month");

  return (data ?? []).map((r) => ({
    description: (r.description as string) ?? "",
    kind: r.kind as string,
    amount: Number(r.amount),
    active: Boolean(r.active),
    start_month: r.start_month as string,
    end_month: (r.end_month as string | null) ?? null,
  }));
}

/**
 * A projeção pronta, com tudo que ela leu.
 *
 * Existe para o Dashboard e a tela de Metas montarem a MESMA conta.
 * Com duas montagens, bastava uma mudar para as duas telas darem
 * números diferentes do mesmo mês, e aí não dá para confiar em
 * nenhuma das duas.
 */
export async function obterProjecao() {
  const { mesAtual } = await import("@/lib/financeiro/meses");
  const { obterCarteira } = await import("@/lib/data/comercial");
  const { custoFixoPorMes, oQueAcabaNaJanela } = await import(
    "@/lib/metas/custo-fixo"
  );
  const { mesesEntre, montarProjecao, somarMeses, clientesParaChegarA } =
    await import("@/lib/metas/projecao");

  const [{ premissas, noBanco }, contratacoes, ritmo, contasFixas, carteira] =
    await Promise.all([
      obterPremissas(),
      listarContratacoes(),
      obterRitmo(),
      listarContasFixasDaProjecao(),
      obterCarteira(mesAtual()),
    ]);

  /* A projeção começa no MÊS QUE VEM: este já está acontecendo, e
     misturar o que é com o que seria é o que torna uma projeção
     inútil. */
  const primeiroMes = somarMeses(mesAtual(), 1);
  const quantos = Math.max(1, mesesEntre(primeiroMes, premissas.mesDaMeta) + 1);

  const mapaDoCustoFixo = custoFixoPorMes(contasFixas, primeiroMes, quantos);

  const projecao = montarProjecao(primeiroMes, premissas, contratacoes, ritmo, {
    clientesAtivos: carteira.ativos.length,
    faturamentoRecorrente: carteira.recorrente,
    custoFixoPorMes: mapaDoCustoFixo,
    custoFixoPadrao: carteira.custoFixo,
    videosDeHoje: carteira.videosPorMes,
  });

  return {
    projecao,
    premissas,
    contratacoes,
    ritmo,
    carteira,
    noBanco,
    primeiroMes,
    mapaDoCustoFixo,
    acabam: oQueAcabaNaJanela(contasFixas, primeiroMes, quantos),
    faltamClientes: clientesParaChegarA(
      projecao.faturamentoMinimo,
      carteira.recorrente,
      premissas.ticketNovo,
    ),
  };
}
