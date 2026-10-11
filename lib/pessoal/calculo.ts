/**
 * =============================================================
 * CÁLCULO DOS GASTOS PESSOAIS
 * =============================================================
 * Regras puras da aba pessoal — nada de banco aqui, para poder ser
 * testado de verdade.
 *
 * A diferença conceitual em relação ao financeiro da empresa:
 *
 *   EMPRESA: o que importa é COMPETÊNCIA e SALDO encadeado — o saldo
 *   final de um mês é o inicial do seguinte, porque é uma série
 *   contínua que tem que fechar com o extrato.
 *
 *   PESSOAL: o que importa é o MÊS FECHADO EM SI — "entrou X, saiu Y,
 *   sobrou Z". Ninguém controla gasto pessoal encadeando saldo de
 *   janeiro até dezembro; a pergunta é sempre "como foi este mês".
 *
 * Por isso aqui não existe saldo inicial nem encadeamento. É de
 * propósito, não é simplificação por preguiça.
 * =============================================================
 */

import { arredondar, dividirSeguro, somar } from "@/lib/financeiro/calculo";

/** O mínimo que um lançamento precisa ter para entrar na conta. */
export interface LancamentoPessoal {
  kind: "Receita" | "Despesa";
  category: string;
  amount: number;
  paid: boolean;
}

/** O mínimo que um item do plano fixo precisa ter. */
export interface FixoPessoal {
  id: string;
  active: boolean;
  start_month: string;
  end_month: string | null;
}

/**
 * Sugestões de categoria. NÃO é uma lista fechada — o campo é texto
 * livre, e cada uma escreve o que quiser. Isto só alimenta o
 * autocompletar, para não ter que digitar "Alimentação" com acento
 * toda vez (e para "mercado" e "Mercado" não virarem duas linhas no
 * relatório).
 */
export const CATEGORIAS_PESSOAIS = [
  "Moradia",
  "Alimentação",
  "Transporte",
  "Saúde",
  "Educação",
  "Lazer",
  "Assinaturas",
  "Roupas",
  "Presentes",
  "Família",
  "Investimento",
  "Outro",
] as const;

export interface ResumoPessoal {
  /** Receitas já recebidas. */
  entrou: number;
  /** Despesas já pagas. */
  saiu: number;
  /** entrou − saiu: o que sobrou de fato. */
  sobrou: number;
  /** Despesas do mês ainda não pagas. */
  aPagar: number;
  /** Receitas do mês ainda não recebidas. */
  aReceber: number;
  /**
   * Como o mês termina se tudo que está marcado como não pago/não
   * recebido acontecer.
   */
  sobraPrevista: number;
  /** Quanto de cada real que entrou foi gasto (0..1+). */
  comprometido: number;
}

/** Fecha o mês pessoal. */
export function resumirMesPessoal(
  lancamentos: LancamentoPessoal[],
): ResumoPessoal {
  const valor = (l: LancamentoPessoal) => Number(l.amount) || 0;

  const receitas = lancamentos.filter((l) => l.kind === "Receita");
  const despesas = lancamentos.filter((l) => l.kind === "Despesa");

  const entrou = somar(receitas.filter((l) => l.paid).map(valor));
  const saiu = somar(despesas.filter((l) => l.paid).map(valor));
  const aReceber = somar(receitas.filter((l) => !l.paid).map(valor));
  const aPagar = somar(despesas.filter((l) => !l.paid).map(valor));

  return {
    entrou,
    saiu,
    sobrou: arredondar(entrou - saiu),
    aPagar,
    aReceber,
    sobraPrevista: arredondar(entrou + aReceber - saiu - aPagar),
    comprometido: dividirSeguro(saiu + aPagar, entrou + aReceber),
  };
}

export interface CategoriaPessoal {
  nome: string;
  /** Já pago. */
  pago: number;
  /** Ainda em aberto. */
  emAberto: number;
  /** pago + emAberto, o peso total da categoria no mês. */
  total: number;
  /** Quantos lançamentos caíram aqui. */
  itens: number;
}

/**
 * Agrupa as DESPESAS por categoria, do maior peso para o menor.
 *
 * A comparação é por nome normalizado (sem espaços nas pontas, sem
 * diferença de maiúscula), mas o nome exibido é o da primeira
 * aparição — assim "mercado" e "Mercado" somam na mesma linha em vez
 * de virarem duas.
 */
export function agruparPorCategoriaPessoal(
  lancamentos: LancamentoPessoal[],
): CategoriaPessoal[] {
  const grupos = new Map<string, CategoriaPessoal>();

  for (const l of lancamentos) {
    if (l.kind !== "Despesa") continue;

    const bruto = (l.category ?? "").trim();
    const nome = bruto || "Sem categoria";
    const chave = nome.toLocaleLowerCase("pt-BR");
    const v = Number(l.amount) || 0;

    const atual = grupos.get(chave) ?? {
      nome,
      pago: 0,
      emAberto: 0,
      total: 0,
      itens: 0,
    };

    grupos.set(chave, {
      nome: atual.nome,
      pago: arredondar(atual.pago + (l.paid ? v : 0)),
      emAberto: arredondar(atual.emAberto + (l.paid ? 0 : v)),
      total: arredondar(atual.total + v),
      itens: atual.itens + 1,
    });
  }

  return [...grupos.values()].sort(
    (a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"),
  );
}

/** Os itens do plano fixo que valem para o mês informado. */
export function fixosVigentes<T extends FixoPessoal>(
  fixos: T[],
  mes: string,
): T[] {
  return fixos.filter(
    (f) =>
      f.active &&
      f.start_month <= mes &&
      (!f.end_month || f.end_month >= mes),
  );
}

/**
 * Quais fixos vigentes ainda NÃO viraram lançamento neste mês.
 *
 * O banco já impede duplicata — `unique (recurrence_id,
 * reference_month)`. Esta função existe para o botão saber quantos
 * itens tem para criar (e para não mandar um insert que vai falhar).
 */
export function fixosAGerar<T extends FixoPessoal>(
  fixos: T[],
  jaGerados: { recurrence_id: string | null }[],
  mes: string,
): T[] {
  const feitos = new Set(
    jaGerados.map((l) => l.recurrence_id).filter((id): id is string => !!id),
  );
  return fixosVigentes(fixos, mes).filter((f) => !feitos.has(f.id));
}
