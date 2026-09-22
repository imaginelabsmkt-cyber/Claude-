import { createClient } from "@/lib/supabase/server";
import {
  listarCategorias,
  listarLancamentos,
  obterPainelMes,
  type PainelMes,
} from "@/lib/data/financeiro";
import { areaDaCategoria, categoriasDaArea } from "@/lib/interno/classificacao";
import { listarObrigacoesUrgentes } from "@/lib/data/empresa";
import {
  rotuloPeriodo,
  textoPrazo as textoPrazoObrigacao,
} from "@/lib/empresa/obrigacoes";
import { somar } from "@/lib/financeiro/calculo";
import type { AreaId } from "@/lib/interno/areas";
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
        origem: areaDaCategoria(l.category?.name),
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
}

/**
 * Painel do Início: cruza financeiro, comercial e as obrigações num
 * lugar só. É a tela que responde "por onde eu começo hoje".
 */
export async function obterPainelInterno(mes: string): Promise<PainelInterno> {
  const supabase = createClient();

  const [
    financeiro,
    lancamentos,
    obrigacoes,
    { data: recorrencias },
    { count: ativos },
  ] = await Promise.all([
      obterPainelMes(mes),
      listarLancamentos({ mes }),
      listarObrigacoesUrgentes(),
      supabase
        .from("financial_recurrences")
        .select("kind, amount, start_month, end_month")
        .eq("active", true),
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("active", true),
    ]);

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
      origem: o.area === "administrativo" ? "administrativo" : "contabil",
      titulo: o.title,
      descricao: `${o.cadence} · ${rotuloPeriodo(o.aberto!.periodo)}`,
      valor: 0,
      prazo: textoPrazoObrigacao(o.aberto!),
      atrasado: o.aberto!.situacao === "Atrasada",
      dias: o.aberto!.dias,
    }));

  const compromissos = [...comoCompromissos(lancamentos), ...daObrigacao].sort(
    (a, b) => {
      if (a.dias === null) return 1;
      if (b.dias === null) return -1;
      return a.dias - b.dias;
    },
  );

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
  id: AreaId,
  mes: string,
): Promise<RecorteArea> {
  const nomes = categoriasDaArea(id);
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
