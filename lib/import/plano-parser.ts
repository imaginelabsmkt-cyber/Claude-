/**
 * =============================================================
 * LEITOR DO PLANO DE AÇÃO (texto -> itens do cronograma)
 * =============================================================
 * Interpreta o texto do plano de ação (o cronograma de "quem faz o quê e
 * quando") e devolve os itens detectados. Função pura (testável), sem banco.
 *
 * O sinal mais confiável de que uma linha é um ITEM do cronograma é o
 * MARCADOR DE RESPONSÁVEL no fim da linha (FAVIE, Vocês fazem, Anúncios,
 * Cliente). Então só emitimos item quando achamos esse marcador — isso evita
 * confundir texto corrido (parágrafos de explicação) com itens. O resto (datas
 * soltas, dias da semana) vira o rótulo de data do item.
 *
 * É "melhor esforço": o resultado é uma prévia que a pessoa revisa e ajusta
 * antes de criar de fato.
 * =============================================================
 */

import { PLANO_STAGES } from "@/types";

export interface ItemPlano {
  titulo: string;
  owner: "FAVIE" | "Cliente";
  status: "A fazer" | "Fazendo" | "Feita";
  /** Previsão em texto, como veio no plano ("05 a 09/10", "toda semana"). */
  dateLabel: string | null;
  /** Data real (início) em ISO "YYYY-MM-DD" para ordenar/virar tarefa. */
  dueDate: string | null;
  /** Etapa do mês, quando o texto traz um cabeçalho de etapa. */
  stage: string | null;
}

/** Remove acentos e baixa a caixa, p/ comparar sem depender de acento. */
function base(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Dia da semana (ou "a confirmar") sozinho numa linha. */
const DIA_SEMANA =
  /^(segunda|terca|quarta|quinta|sexta|sabado|domingo|a confirmar)\.?$/;

/**
 * Início de linha que é uma DATA (ou faixa). Cobre: "30/09", "até 02/10",
 * "a partir de 13/10", "05 a 09/10", "14 e 15/10" e "toda semana".
 */
const DATA_INICIO =
  /^((?:ate\s+|a partir de\s+)?\d{1,2}(?:\s*(?:a|e)\s*\d{1,2})?\s*\/\s*\d{1,2}|toda\s+semana)(?=\s|$)/;

/** Marcador de responsável/status no FIM da linha (para ir tirando um a um). */
const MARCADOR_FIM =
  /\s*(FAVIE|An[úu]ncios|Voc[êe]s\s+fazem|Voc[êe]\s+faz|Cliente|J[áa]\s+feito\s*✓?|Em\s+andamento|✓)\s*$/i;

/** Converte o rótulo de data no ISO da data de INÍCIO (ou null). */
function dataInicioISO(label: string, ano: number): string | null {
  const b = base(label);
  if (/toda\s+semana|a confirmar/.test(b)) return null;
  // "05 a 09/10" / "14 e 15/10" -> usa o primeiro dia com o mês do fim.
  const faixa = b.match(/(\d{1,2})\s*(?:a|e)\s*\d{1,2}\s*\/\s*(\d{1,2})/);
  if (faixa) return montarISO(Number(faixa[1]), Number(faixa[2]), ano);
  const simples = b.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (simples) return montarISO(Number(simples[1]), Number(simples[2]), ano);
  return null;
}

function montarISO(dia: number, mes: number, ano: number): string | null {
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/**
 * Tira os marcadores do fim da linha e devolve o título limpo + owner/status.
 * Retorna null quando NÃO há nenhum marcador de responsável (não é item).
 */
function extrairMarcadores(
  linha: string,
): { titulo: string; owner: "FAVIE" | "Cliente"; status: "A fazer" | "Fazendo" | "Feita" } | null {
  let resto = linha;
  let temFavie = false;
  let temCliente = false;
  let status: "A fazer" | "Fazendo" | "Feita" = "A fazer";

  let m: RegExpMatchArray | null;
  // Vai tirando marcadores do fim, um por um (ex.: "... FAVIE Vocês fazem").
  while ((m = resto.match(MARCADOR_FIM))) {
    const tok = base(m[1]);
    if (tok === "favie" || tok.startsWith("anuncio")) temFavie = true;
    else if (tok.startsWith("voce") || tok === "cliente") temCliente = true;
    else if (tok.startsWith("ja feito") || tok === "✓") status = "Feita";
    else if (tok.startsWith("em andamento")) status = "Fazendo";
    resto = resto.slice(0, m.index).trimEnd();
  }

  if (!temFavie && !temCliente) return null; // sem responsável => não é item

  // FAVIE executa mesmo quando o cliente também participa (ex.: a sessão de
  // fotos, onde a FAVIE grava e o cliente leva os modelos).
  const owner: "FAVIE" | "Cliente" = temFavie ? "FAVIE" : "Cliente";
  const titulo = resto.replace(/\s+/g, " ").trim();
  if (titulo.length < 3) return null;
  return { titulo, owner, status };
}

/** Detecta um cabeçalho de etapa (linha que é só "Preparar", "Produzir"…). */
function detectarEtapa(linha: string): string | null {
  const b = base(linha).replace(/^\d+\s*[.)-]?\s*/, ""); // tira "1 ", "2) "…
  for (const etapa of PLANO_STAGES) {
    if (b === base(etapa)) return etapa;
  }
  return null;
}

/**
 * Interpreta o texto do plano de ação. `ano` monta as datas (o texto traz só
 * dia/mês). Devolve os itens na ordem em que aparecem.
 */
export function parsePlanoAcao(texto: string, ano: number): ItemPlano[] {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const itens: ItemPlano[] = [];
  let dateLabel: string | null = null;
  let stage: string | null = null;

  const emitir = (linhaItem: string) => {
    const mk = extrairMarcadores(linhaItem);
    if (!mk) return;
    itens.push({
      titulo: mk.titulo,
      owner: mk.owner,
      status: mk.status,
      dateLabel,
      dueDate: dateLabel ? dataInicioISO(dateLabel, ano) : null,
      stage,
    });
  };

  for (const linha of linhas) {
    // separadores só de símbolos
    if (/^[\W_]+$/.test(linha)) continue;

    const etapa = detectarEtapa(linha);
    if (etapa) {
      stage = etapa;
      continue;
    }

    const bl = base(linha);

    const mData = linha.match(DATA_INICIO) ?? bl.match(DATA_INICIO);
    if (mData) {
      // Usa o texto ORIGINAL do trecho de data para o rótulo (mantém acentos).
      const bruto = linha.slice(0, mData[0].length).trim();
      dateLabel = bruto || mData[0].trim();
      const remainder = linha.slice(mData[0].length).trim();
      if (remainder) emitir(remainder); // data + item na mesma linha
      continue;
    }

    if (DIA_SEMANA.test(bl)) {
      // Dia da semana solto: agrega ao rótulo da data atual ("30/09 quarta").
      if (dateLabel && !base(dateLabel).includes(bl)) {
        dateLabel = `${dateLabel} ${linha}`;
      }
      continue;
    }

    emitir(linha);
  }

  return itens;
}
