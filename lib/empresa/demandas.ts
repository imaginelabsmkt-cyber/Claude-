import type { AreaId } from "@/lib/interno/areas";
import {
  montarFila,
  pedemAtencao,
  type AtividadeNaFila,
  type FilaDeTrabalho,
} from "@/lib/comercial/atividades";

/**
 * Demandas internas: as tarefas da empresa que não são de ninguém de
 * fora.
 *
 * A Fran: "tarefas avulsas da empresa que não são de cliente nem de
 * lead."
 *
 * Aqui mora só a REGRA. A tela desenha e o banco guarda.
 *
 * Ela entra na MESMA fila das atividades do comercial, pela mesma
 * função (`montarFila`), e não numa lista própria do lado. Era isso
 * ou ter duas noções de "atrasado" na mesma página, que é o começo
 * de dois números diferentes para a mesma coisa.
 */

/** As áreas que uma demanda pode ter. Casam com `lib/interno/areas.ts`. */
export const AREAS_DA_DEMANDA = [
  "administrativo",
  "comercial",
  "financeiro",
] as const;

export type AreaDaDemanda = (typeof AREAS_DA_DEMANDA)[number];

export interface Demanda {
  id: string;
  title: string;
  area: AreaDaDemanda;
  /** Nome de quem é responsável. `null` quer dizer "as duas". */
  responsavel: string | null;
  /** "YYYY-MM-DD" ou null. */
  due_date: string | null;
  notes: string | null;
  /** Quando foi concluída, em ISO. `null` = aberta. */
  done_at: string | null;
}

/** Como a demanda entra na fila, que fala a língua das atividades. */
export function comoAtividade(d: Demanda): AtividadeNaFila & { demanda: Demanda } {
  return {
    id: d.id,
    subject: d.title,
    kind: "Demanda",
    /* A fila trabalha com instante; a demanda tem só o DIA. Meio-dia
       no fuso da agência mantém o dia certo dos dois lados: às 00:00
       de Boa Vista ainda é o dia anterior em UTC, e a demanda de hoje
       aparecia como atrasada. */
    due_at: d.due_date ? `${d.due_date}T12:00:00-04:00` : null,
    done_at: d.done_at,
    demanda: d,
  };
}

/** A fila das demandas abertas, nas mesmas quatro gavetas das outras. */
export function filaDasDemandas(
  demandas: Demanda[],
  agora: Date,
): FilaDeTrabalho<AtividadeNaFila & { demanda: Demanda }> {
  return montarFila(demandas.filter((d) => !d.done_at).map(comoAtividade), agora);
}

/** Quantas pedem atenção agora: atrasadas mais as de hoje. */
export function demandasQuePedemAtencao(
  demandas: Demanda[],
  agora: Date,
): number {
  return pedemAtencao(filaDasDemandas(demandas, agora));
}

/**
 * As concluídas nos últimos `dias` dias, da mais recente para a mais
 * antiga.
 *
 * Existem para dar como desfazer sem ir procurar: quem marca por
 * engano percebe na hora, e o lugar de corrigir é onde o engano
 * aconteceu.
 */
export function concluidasRecentemente(
  demandas: Demanda[],
  agora: Date,
  dias = 7,
): Demanda[] {
  const limite = agora.getTime() - dias * 86400000;
  return demandas
    .filter((d) => {
      if (!d.done_at) return false;
      const t = new Date(d.done_at).getTime();
      return !Number.isNaN(t) && t >= limite && t <= agora.getTime();
    })
    .sort((a, b) => (a.done_at! < b.done_at! ? 1 : -1));
}

/** A área da demanda, no vocabulário do menu, para pegar a cor. */
export function areaDaDemanda(d: Demanda): AreaId {
  return d.area as AreaId;
}

/** Quem aparece como responsável na linha. */
export function quemFaz(d: Demanda): string {
  return d.responsavel ?? "As duas";
}

/* ------------------------------------------------------------------ */

export interface ErroDeDemanda {
  campo: "title" | "area" | "due_date";
  mensagem: string;
}

/**
 * Confere uma demanda antes de gravar.
 *
 * O limite de 140 caracteres não é capricho: o título é uma linha de
 * lista, e um texto comprido empurra prazo e responsável para fora da
 * tela. O que não couber vai para a observação.
 */
export function conferirDemanda(entrada: {
  title: string;
  area: string;
  due_date?: string | null;
}): ErroDeDemanda[] {
  const erros: ErroDeDemanda[] = [];
  const titulo = entrada.title.trim();

  if (!titulo) {
    erros.push({ campo: "title", mensagem: "Escreva o que precisa ser feito." });
  } else if (titulo.length > 140) {
    erros.push({
      campo: "title",
      mensagem: "O título passa de 140 letras. O resto cabe na observação.",
    });
  }

  if (!AREAS_DA_DEMANDA.includes(entrada.area as AreaDaDemanda)) {
    erros.push({ campo: "area", mensagem: "Escolha a área." });
  }

  const prazo = (entrada.due_date ?? "").trim();
  if (prazo && !/^\d{4}-\d{2}-\d{2}$/.test(prazo)) {
    erros.push({ campo: "due_date", mensagem: "Use uma data válida." });
  }

  return erros;
}

/* ------------------------------------------------------------------ */

/** O mínimo que o Dashboard precisa de um compromisso. */
export interface CompromissoDaDemanda {
  id: string;
  origem: AreaId;
  titulo: string;
  descricao: string;
  valor: number;
  prazo: string;
  atrasado: boolean;
  dias: number | null;
}

/**
 * As demandas abertas, no formato das Pendências do Dashboard.
 *
 * Entram na MESMA lista dos compromissos do financeiro e do
 * comercial, ordenada por urgência. Uma lista separada de demandas
 * do lado faria a pessoa somar duas listas de cabeça para saber o
 * que fazer primeiro.
 *
 * `prazoEmPalavras` é passada de fora para esta função continuar pura
 * e testável sem relógio.
 */
export function demandasComoCompromissos(
  demandas: Demanda[],
  agora: Date,
  prazoEmPalavras: (due: string | null, agora: Date) => string,
): CompromissoDaDemanda[] {
  return demandas
    .filter((d) => !d.done_at)
    .map((d) => {
      const a = comoAtividade(d);
      const dias = d.due_date
        ? Math.round(
            (new Date(a.due_at!).getTime() - agora.getTime()) / 86400000,
          )
        : null;
      const palavras = prazoEmPalavras(a.due_at, agora);
      const atrasado = dias != null && dias < 0;
      return {
        id: `demanda-${d.id}`,
        origem: d.area as AreaId,
        titulo: d.title,
        descricao: `Demanda · ${quemFaz(d)}`,
        valor: 0,
        prazo: atrasado ? `venceu ${palavras}` : palavras,
        atrasado: dias != null && dias <= 3,
        dias,
      };
    });
}
