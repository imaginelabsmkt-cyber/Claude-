/**
 * =============================================================
 * LEITOR DO PLANO DE AÇÃO (texto do PDF -> itens do cronograma)
 * =============================================================
 * Interpreta o texto do plano de ação (o cronograma de "quem faz o quê e
 * quando") e devolve os itens detectados. Função pura (testável), sem banco.
 *
 * O texto vem do pdf.js e é BAGUNÇADO: palavras grudadas por espaços
 * ("per fi l" = "perfil"), espaços duplos entre palavras, o dia da semana na
 * MESMA linha do item ("quarta Aprovação ... Vocês fazem"), datas quebradas em
 * duas linhas ("toda"/"semana", "a partir de"/"13/10"). Então a gente limpa,
 * junta as datas quebradas e usa o MARCADOR DE RESPONSÁVEL no fim da linha
 * (FAVIE, Vocês fazem, Anúncios…) como âncora do que é item de verdade — assim
 * texto corrido de explicação não vira item.
 *
 * É "melhor esforço": o resultado é uma prévia que a pessoa revisa e ajusta.
 * =============================================================
 */

export interface ItemPlano {
  titulo: string;
  owner: "FAVIE" | "Cliente";
  status: "A fazer" | "Fazendo" | "Feita";
  /** Previsão em texto, como veio no plano ("05 a 09/10", "toda semana"). */
  dateLabel: string | null;
  /** Data real (início) em ISO "YYYY-MM-DD" para ordenar/virar tarefa. */
  dueDate: string | null;
  /** Etapa do mês (não é lida do PDF automaticamente; a pessoa define). */
  stage: string | null;
}

/** Remove acentos e baixa a caixa (para comparar sem depender de acento). */
function base(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Limpa uma linha crua do PDF: junta espaços, remonta ligaduras separadas
 * ("per fi l" -> "perfil", "con fi rmar" -> "confirmar").
 */
function limpar(s: string): string {
  let t = s.replace(/\s+/g, " ").trim();
  // Roda duas vezes para casos encadeados.
  t = t.replace(/(\p{L})\s(fi|fl|ffi|ff)\s(\p{L})/giu, "$1$2$3");
  t = t.replace(/(\p{L})\s(fi|fl|ffi|ff)\s(\p{L})/giu, "$1$2$3");
  // Ligadura no começo de palavra depois de pontuação: ", fi xados" -> ", fixados".
  t = t.replace(/([,.;:(]\s?)(fi|fl|ffi|ff)\s(\p{L})/giu, "$1$2$3");
  return t;
}

/** Dia da semana (ou "a confirmar") que aparece colado antes do título. */
const PREFIXO_DATA =
  /^(segunda|terca|quarta|quinta|sexta|sabado|domingo|a confirmar)\s+/;

/**
 * Início de linha que é uma DATA (ou faixa). Cobre: "30/09", "até 02/10",
 * "a partir de 13/10", "05 a 09/10", "14 e 15/10" e "toda semana".
 */
const DATA_INICIO =
  /^((?:ate\s+|a partir de\s+)?\d{1,2}(?:\s*(?:a|e)\s*\d{1,2})?\s*\/\s*\d{1,2}|toda\s+semana)(?=\s|$)/;

/**
 * Marcador de responsável/status no FIM da linha. É CASE-SENSITIVE de
 * propósito: "Anúncios" (coluna) é marcador, mas "anúncios" em texto corrido
 * ("…e os anúncios") NÃO é — senão a prosa viraria item.
 */
const MARCADOR_FIM =
  /\s*(FAVIE|An[úu]ncios|Voc[êe]s\s+fazem|Voc[êe]s\s+mandam(?:\s+fazer)?|Voc[êe]\s+faz|Cliente|J[áa]\s+feito\s*✓?|Em\s+andamento|✓)\s*$/;

/** Converte o rótulo de data no ISO da data de INÍCIO (ou null). */
function dataInicioISO(label: string, ano: number): string | null {
  const b = base(label);
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
 * Tira os marcadores do fim da linha. Devolve o corpo (ainda com a eventual
 * data/dia da semana na frente) + owner/status. Null se não há responsável.
 */
function extrairMarcadores(linha: string): {
  corpo: string;
  owner: "FAVIE" | "Cliente";
  status: "A fazer" | "Fazendo" | "Feita";
} | null {
  let resto = linha;
  let temFavie = false;
  let temCliente = false;
  let status: "A fazer" | "Fazendo" | "Feita" = "A fazer";

  let m: RegExpMatchArray | null;
  while ((m = resto.match(MARCADOR_FIM))) {
    const tok = base(m[1]);
    if (tok === "favie" || tok.startsWith("anuncio")) temFavie = true;
    else if (tok.startsWith("voce") || tok === "cliente") temCliente = true;
    else if (tok.startsWith("ja feito") || tok === "✓") status = "Feita";
    else if (tok.startsWith("em andamento")) status = "Fazendo";
    resto = resto.slice(0, m.index).trimEnd();
  }

  if (!temFavie && !temCliente) return null;
  // FAVIE executa mesmo quando o cliente também participa (ex.: a sessão de
  // fotos, onde a FAVIE grava e o cliente leva os modelos).
  const owner: "FAVIE" | "Cliente" = temFavie ? "FAVIE" : "Cliente";
  return { corpo: resto.replace(/\s+/g, " ").trim(), owner, status };
}

/** Tira o dia da semana / "a confirmar" da frente; devolve resto + o prefixo. */
function tirarPrefixoData(corpo: string): { resto: string; prefixo: string | null } {
  const m = base(corpo).match(PREFIXO_DATA);
  if (!m) return { resto: corpo, prefixo: null };
  return {
    resto: corpo.slice(m[0].length).trim(),
    prefixo: corpo.slice(0, m[0].length).trim(),
  };
}

/** Limpa o título: tira "Observação:", pontuação solta e espaços. */
function limparTitulo(s: string): string {
  let t = s.replace(/^observa[çc][ãa]o\s*:?\s*/i, "");
  t = t.replace(/^[\s:;,·•\-–—]+/, "");
  // Tira os espaços presos DENTRO de aspas/parênteses (mantém os de fora).
  t = t.replace(/"\s*([^"]*?)\s*"/g, '"$1"');
  t = t.replace(/\(\s*([^)]*?)\s*\)/g, "($1)");
  t = t.replace(/\s+([,.;:!?])/g, "$1");
  return t.replace(/\s+/g, " ").trim();
}

/**
 * Interpreta o texto do plano de ação. `ano` monta as datas (o texto traz só
 * dia/mês). Devolve os itens na ordem em que aparecem.
 */
export function parsePlanoAcao(texto: string, ano: number): ItemPlano[] {
  const cruas = texto
    .split(/\r?\n/)
    .map(limpar)
    .filter((l) => l.length > 0);

  // Junta as datas quebradas em duas linhas: "toda"+"semana …" e
  // "a partir de"+"13/10 …".
  const linhas: string[] = [];
  for (let i = 0; i < cruas.length; i++) {
    let l = cruas[i];
    const b = base(l);
    if (b === "toda" && i + 1 < cruas.length) l = `${l} ${cruas[++i]}`;
    else if (/(^|\s)a partir de$/.test(b) && i + 1 < cruas.length)
      l = `${l} ${cruas[++i]}`;
    linhas.push(l);
  }

  const itens: ItemPlano[] = [];
  let dataPendente: string | null = null; // data numa linha só antes do item

  for (const linha of linhas) {
    if (/^[\W_]+$/.test(linha)) continue;

    const mk = extrairMarcadores(linha);
    if (mk) {
      let corpo = mk.corpo;
      let dateLabel: string | null;

      const mData = base(corpo).match(DATA_INICIO);
      if (mData) {
        // Data na própria linha do item ("05 a 09/10 Auditoria…").
        dateLabel = corpo.slice(0, mData[0].length).trim();
        corpo = corpo.slice(mData[0].length).trim();
      } else {
        // Data veio na linha anterior; aqui pode ter o dia da semana colado.
        const pre = tirarPrefixoData(corpo);
        corpo = pre.resto;
        dateLabel = dataPendente
          ? pre.prefixo
            ? `${dataPendente} ${pre.prefixo}`
            : dataPendente
          : pre.prefixo;
      }

      const titulo = limparTitulo(corpo);
      if (titulo.length >= 3) {
        itens.push({
          titulo,
          owner: mk.owner,
          status: mk.status,
          dateLabel: dateLabel || null,
          dueDate: dateLabel ? dataInicioISO(dateLabel, ano) : null,
          stage: null,
        });
      }
      dataPendente = null; // consumida
      continue;
    }

    // Linha sem responsável: se for uma data sozinha, guarda pro próximo item.
    const md = base(linha).match(DATA_INICIO);
    if (md) dataPendente = linha.slice(0, md[0].length).trim();
    // Senão: texto corrido -> ignora.
  }

  return itens;
}
