import { createClient } from "@/lib/supabase/server";
import {
  listarCategorias,
  listarClientesFinanceiro,
  listarLancamentos,
  obterConfiguracaoFinanceira,
  receitaPorClienteNoAno,
  obterPainelMes,
  obterResumoAnual,
  type PainelMes,
} from "@/lib/data/financeiro";
import { anoDoMes, mesDeHoje } from "@/lib/financeiro/meses";
import { faturamentoAnual, type FaturamentoAnual } from "@/lib/interno/ano";
import { metaDoAno, type MetaDoAno } from "@/lib/interno/meta";
import {
  areaDoAssunto,
  assuntoDaCategoria,
  categoriasDoAssunto,
  type Assunto,
} from "@/lib/interno/classificacao";
import { listarObrigacoesUrgentes } from "@/lib/data/empresa";
import { listarContratosDeCliente } from "@/lib/data/contratos";
import { listarLeads } from "@/lib/data/comercial";
import { contratosQuePedemConversa } from "@/lib/empresa/contratos";
import { ETAPAS_ABERTAS, valorDoFunil } from "@/lib/comercial/funil";
import {
  contarUrgentes,
  situacaoDoLancamento,
} from "@/lib/financeiro/vencimento";
import { LEAD_STAGES_ABERTAS } from "@/types";
import {
  renovacoesProximas,
  textoRenovacao,
  type ContratoVigente,
} from "@/lib/comercial/funil";
import {
  rotuloPeriodo,
  textoPrazo as textoPrazoObrigacao,
} from "@/lib/empresa/obrigacoes";
import { somar } from "@/lib/financeiro/calculo";
import type { AreaId } from "@/lib/interno/areas";
import {
  calcularFolego,
  MESES_DE_BASE,
  type Folego,
} from "@/lib/interno/folego";
import { ultimosMesesFechados } from "@/lib/data/financeiro";
import type { FinancialEntryWithRelations } from "@/types";

/** Um compromisso com prazo, já sabendo de que área ele é. */
export interface Compromisso {
  id: string;
  origem: AreaId;
  titulo: string;
  descricao: string;
  valor: number;
  /** Texto pronto do prazo ("vence amanhã", "dia 30", "sem data"). */
  prazo: string;
  /** Venceu ou vence em até 3 dias. */
  atrasado: boolean;
  /** Para ordenar: dias até o vencimento (nulos vão para o fim). */
  dias: number | null;
}

/** Data de hoje em "YYYY-MM-DD", no fuso local. */
function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Dias entre hoje e uma data "YYYY-MM-DD" (negativo = já passou). */
function diasAte(data: string | null): number | null {
  if (!data) return null;
  const [a, m, d] = data.split("-").map(Number);
  const alvo = new Date(a, m - 1, d);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

/** Texto humano do prazo. */
function textoPrazo(dias: number | null): string {
  if (dias === null) return "sem data";
  if (dias < -1) return `venceu há ${Math.abs(dias)} dias`;
  if (dias === -1) return "venceu ontem";
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "vence amanhã";
  if (dias <= 30) return `em ${dias} dias`;
  return `em ${Math.round(dias / 30)} meses`;
}

/**
 * Converte lançamentos pendentes em compromissos, carimbando a área de
 * origem a partir da categoria.
 */
function comoCompromissos(lancamentos: FinancialEntryWithRelations[]): Compromisso[] {
  return lancamentos
    .filter((l) => l.status === "Pendente")
    .map((l) => {
      const dias = diasAte(l.due_date);
      return {
        id: l.id,
        origem: areaDoAssunto(assuntoDaCategoria(l.category?.name)),
        titulo: l.description,
        descricao: l.client?.name ?? l.category?.name ?? "—",
        valor: Number(l.amount),
        prazo: textoPrazo(dias),
        atrasado: dias !== null && dias <= 3,
        dias,
      };
    })
    .sort((a, b) => {
      if (a.dias === null) return 1;
      if (b.dias === null) return -1;
      return a.dias - b.dias;
    });
}

/** O que a tela Início mostra. */
export interface PainelInterno {
  mes: string;
  financeiro: PainelMes;
  /** Pendências do mês, de todas as áreas, ordenadas por urgência. */
  compromissos: Compromisso[];
  /** Quantos compromissos estão vencidos ou vencendo. */
  urgentes: number;
  /** Clientes ativos e o que eles somam por mês. */
  carteira: { ativos: number; recorrente: number };
  /** Custo fixo mensal (recorrências de despesa ativas). */
  custoFixo: number;
  /** Quanto tempo o caixa aguenta no ritmo dos últimos meses. */
  folego: Folego;
  /** O ano fechado: faturamento, resultado e as doze colunas do gráfico. */
  ano: FaturamentoAnual;
  /** A meta de faturamento do ano, quando há uma configurada. */
  meta: MetaDoAno | null;
  /** O que já venceu e continua em aberto, dos dois lados. */
  vencido: { aReceber: number; aPagar: number; quantos: number };
  /** O comercial em uma linha. */
  comercial: { emAberto: number; seTudoFechar: number };
  /**
   * O funil por etapa, para o painel desenhar.
   *
   * O Dashboard mostrava o dinheiro e mais nada: "não parece um
   * sistema de gestão de uma empresa, onde tem administrativo, onde
   * tem comercial". Cada área tem a sua barra aqui.
   */
  funilPorEtapa: { rotulo: string; valor: number; detalhe: string }[];
  /** Quanto cada cliente rendeu no ano. */
  receitaPorCliente: { rotulo: string; valor: number }[];
  /** O administrativo em uma linha. */
  administrativo: { contratosQuePedemConversa: number };
}

/**
 * Painel do Início: cruza financeiro, comercial e as obrigações num
 * lugar só. É a tela que responde "por onde eu começo hoje".
 */
export async function obterPainelInterno(mes: string): Promise<PainelInterno> {
  const supabase = createClient();
  const hoje = hojeISO();

  const [
    financeiro,
    lancamentos,
    obrigacoes,
    resumoAnual,
    contratosDeCliente,
    leadsAbertos,
    configuracao,
    receitaCliente,
    clientesDoFinanceiro,
    { data: recorrencias },
    { count: ativos },
  ] = await Promise.all([
      obterPainelMes(mes),
      listarLancamentos({ mes }),
      listarObrigacoesUrgentes(),
      obterResumoAnual(anoDoMes(mes)),
      listarContratosDeCliente(),
      listarLeads(LEAD_STAGES_ABERTAS),
      obterConfiguracaoFinanceira(),
      receitaPorClienteNoAno(anoDoMes(mes)),
      listarClientesFinanceiro(),
      supabase
        .from("financial_recurrences")
        .select("id, description, client_id, kind, amount, start_month, end_month, active")
        .eq("active", true),
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("active", true),
    ]);

  const anoFechado = faturamentoAnual(resumoAnual.ano, resumoAnual.serie);
  const nomesDeCliente = new Map(
    clientesDoFinanceiro.map((c) => [c.id, c.name]),
  );

  const vigentes = (recorrencias ?? []).filter(
    (r) => r.start_month <= mes && (!r.end_month || r.end_month >= mes),
  );

  // As obrigações com prazo próprio entram na mesma lista das pendências
  // financeiras — no Início, tudo que tem prazo aparece junto, cada linha
  // com a cor da sua área.
  const daObrigacao: Compromisso[] = obrigacoes
    .filter((o) => o.aberto !== null)
    .map((o) => ({
      id: `obrigacao-${o.id}`,
      origem:
        o.area === "administrativo" ? "administrativo" : "financeiro",
      titulo: o.title,
      descricao: `${o.cadence} · ${rotuloPeriodo(o.aberto!.periodo)}`,
      valor: 0,
      prazo: textoPrazoObrigacao(o.aberto!),
      atrasado: o.aberto!.situacao === "Atrasada",
      dias: o.aberto!.dias,
    }));

  // Contrato chegando ao fim é aviso do comercial: a mensalidade continua
  // sendo gerada, mas sem vigência que a sustente. Sai do `end_month` da
  // recorrência — não existe tabela de contratos.
  const contratos: ContratoVigente[] = vigentes
    .filter((r) => r.kind === "Receita")
    .map((r) => ({
      id: r.id,
      description: r.description,
      clientId: r.client_id,
      amount: Number(r.amount),
      endMonth: r.end_month,
      active: r.active,
    }));

  const daRenovacao: Compromisso[] = renovacoesProximas(contratos).map((r) => ({
    id: `renovacao-${r.id}`,
    origem: "comercial" as const,
    titulo: r.description.replace(/^Mensalidade /, "Renovar contrato — "),
    descricao: `contrato vai até ${r.endMonth}`,
    valor: r.amount,
    prazo: textoRenovacao(r),
    atrasado: r.dias <= 7,
    dias: r.dias,
  }));

  const compromissos = [
    ...comoCompromissos(lancamentos),
    ...daObrigacao,
    ...daRenovacao,
  ].sort(
    (a, b) => {
      if (a.dias === null) return 1;
      if (b.dias === null) return -1;
      return a.dias - b.dias;
    },
  );

  // O fôlego olha os meses JÁ FECHADOS: incluir o mês corrente, que
  // normalmente está pela metade, faria a queima parecer maior.
  const fechados = await ultimosMesesFechados(mes, MESES_DE_BASE);

  return {
    mes,
    financeiro,
    compromissos,
    urgentes: compromissos.filter((c) => c.atrasado).length,
    carteira: {
      ativos: ativos ?? 0,
      recorrente: somar(
        vigentes.filter((r) => r.kind === "Receita").map((r) => Number(r.amount)),
      ),
    },
    custoFixo: somar(
      vigentes.filter((r) => r.kind === "Despesa").map((r) => Number(r.amount)),
    ),
    folego: calcularFolego(financeiro.resumo.saldoFinal, fechados, mes),
    ano: anoFechado,
    meta: metaDoAno(
      configuracao.annual_revenue_goal,
      anoFechado.recebido,
      anoFechado.ano,
      mesDeHoje(),
    ),
    vencido: {
      aReceber: somar(
        financeiro.aReceber
          .filter((l) => situacaoDoLancamento(l, hoje) === "Vencido")
          .map((l) => Number(l.amount)),
      ),
      aPagar: somar(
        financeiro.aPagar
          .filter((l) => situacaoDoLancamento(l, hoje) === "Vencido")
          .map((l) => Number(l.amount)),
      ),
      quantos: contarUrgentes(
        [...financeiro.aReceber, ...financeiro.aPagar],
        hoje,
      ),
    },
    comercial: {
      emAberto: leadsAbertos.length,
      seTudoFechar: valorDoFunil(leadsAbertos),
    },
    funilPorEtapa: ETAPAS_ABERTAS.map((etapa) => {
      const naEtapa = leadsAbertos.filter((l) => l.stage === etapa);
      return {
        rotulo: etapa,
        valor: somar(naEtapa.map((l) => Number(l.estimated_monthly ?? 0))),
        detalhe:
          naEtapa.length === 1
            ? "1 oportunidade"
            : `${naEtapa.length} oportunidades`,
      };
    }),
    receitaPorCliente: Object.entries(receitaCliente).map(([id, valor]) => ({
      rotulo: nomesDeCliente.get(id) ?? "Cliente",
      valor,
    })),
    administrativo: {
      contratosQuePedemConversa: contratosQuePedemConversa(
        contratosDeCliente,
        hoje,
      ).length,
    },
  };
}

/** Recorte de uma área sobre os lançamentos do mês. */
export interface RecorteArea {
  mes: string;
  /** Lançamentos do mês que pertencem às categorias da área. */
  lancamentos: FinancialEntryWithRelations[];
  /** Total já pago no mês. */
  realizado: number;
  /** Total ainda em aberto no mês. */
  pendente: number;
  /** O que se repete todo mês nessa área (recorrências ativas). */
  mensal: number;
  /** Total pago no ano corrente. */
  noAno: number;
}

/**
 * Monta o recorte de uma área sobre o financeiro — é o que faz Pessoas,
 * Contábil e Administrativo existirem sem tabela própria.
 */
export async function obterRecorteArea(
  assunto: Assunto,
  mes: string,
): Promise<RecorteArea> {
  const nomes = categoriasDoAssunto(assunto);
  const ano = mes.slice(0, 4);

  const [categorias, doMes, doAno, supabaseRecorrencias] = await Promise.all([
    listarCategorias(),
    listarLancamentos({ mes }),
    listarLancamentos({ mesInicio: `${ano}-01`, mesFim: `${ano}-12` }),
    createClient()
      .from("financial_recurrences")
      .select("amount, category_id, start_month, end_month")
      .eq("active", true),
  ]);

  const idsDaArea = new Set(
    categorias.filter((c) => nomes.includes(c.name)).map((c) => c.id),
  );
  const daArea = (l: FinancialEntryWithRelations) => idsDaArea.has(l.category_id);

  const lancamentos = doMes.filter(daArea);
  const vigentes = (supabaseRecorrencias.data ?? []).filter(
    (r) =>
      idsDaArea.has(r.category_id) &&
      r.start_month <= mes &&
      (!r.end_month || r.end_month >= mes),
  );

  return {
    mes,
    lancamentos,
    realizado: somar(
      lancamentos.filter((l) => l.status === "Pago").map((l) => Number(l.amount)),
    ),
    pendente: somar(
      lancamentos.filter((l) => l.status === "Pendente").map((l) => Number(l.amount)),
    ),
    mensal: somar(vigentes.map((r) => Number(r.amount))),
    noAno: somar(
      doAno
        .filter((l) => daArea(l) && l.status === "Pago")
        .map((l) => Number(l.amount)),
    ),
  };
}
