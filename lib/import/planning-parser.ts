/**
 * =============================================================
 * LEITOR DE PLANEJAMENTO (documento da Vitória -> conteúdos)
 * =============================================================
 * Interpreta o texto do planejamento (formato verticalizado) e devolve
 * uma lista de conteúdos detectados. É uma função pura (testável), sem
 * dependências de banco.
 *
 * Marcadores reconhecidos (aceita variações de acento/maiúsculas):
 *  - "SEMANA 1"                         -> semana
 *  - "CONTEÚDO N: <FORMATO> <TÍTULO>"   -> início de um conteúdo
 *  - "DATA (DA POSTAGEM): 05/07"        -> data prevista
 *  - "LOCAL:", "VESTIMENTA:", "PARTICIPANTES:", "REFERÊNCIA:"/"LINK:", "OBS:"
 * =============================================================
 */

/**
 * Separador INTERNO de coluna de tabela: guarda a estrutura da tabela do
 * roteiro (ex.: FALA | CENAS) dentro do texto. Caractere de uso privado, que
 * nunca aparece em conteúdo real.
 */
export const COL_DELIM = "\uE000";

export interface ItemPlanejamento {
  titulo: string;
  formato: string; // Reel, Carrossel, Story, Post estático, Vídeo longo
  semana: number | null;
  /** Data prevista em ISO "YYYY-MM-DD" (ou null se não detectada). */
  dataPrevista: string | null;
  precisaGravacao: boolean;
  local: string | null;
  vestimenta: string | null;
  participantes: string[];
  link: string | null;
  observacoes: string | null;
  /** Corpo do conteúdo (cenas/falas/stories) — o roteiro completo. */
  roteiro: string | null;
  /** Legenda do post. */
  legenda: string | null;
}

const FORMATOS_SEM_GRAVACAO = new Set(["Carrossel", "Post estático"]);

/** Detecta o formato a partir de uma palavra/linha. */
function detectarFormato(texto: string): string | null {
  const t = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  if (/\bCARROSS?EL\b|\bCAROUSEL\b/.test(t)) return "Carrossel";
  if (/\bSTORIES?\b/.test(t)) return "Story";
  if (/\bVIDEO\b|\bVLOG\b/.test(t)) return "Vídeo longo";
  if (/\bREELS?\b|\bTREND\b|\bREEL\b/.test(t)) return "Reel";
  if (/\bARTE\b|\bPOST\b|\bFEED\b|\bEST[AÁ]TICO\b/.test(t)) return "Post estático";
  return null;
}

/** Conectivos que ficam em minúsculo no meio do título (Title Case pt-BR). */
const MINUSCULAS = new Set([
  "de", "da", "do", "das", "dos", "e", "a", "o", "as", "os", "um", "uma",
  "para", "pra", "por", "com", "em", "no", "na", "nos", "nas", "ao", "aos",
  "à", "às", "que", "the", "of",
]);

/** Deixa o título "bonito": Primeira Letra De Cada Palavra Maiúscula. */
export function tituloBonito(texto: string): string {
  const palavras = texto.toLowerCase().split(/\s+/).filter(Boolean);
  return palavras
    .map((p, i) => {
      if (i > 0 && MINUSCULAS.has(p)) return p;
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(" ");
}

/** Remove a palavra do formato do início do título e normaliza. */
function limparTitulo(resto: string): string {
  let s = resto.trim();
  // remove prefixos de formato conhecidos no começo
  s = s.replace(
    /^(reels?|trend|carross?el|carousel|stories?|story|v[ií]deo|vlog|arte|post(\s+est[aá]tico)?|feed)\b[\s:–-]*/i,
    "",
  );
  s = s.trim().replace(/\s+/g, " ");
  if (!s) return "Conteúdo sem título";
  return tituloBonito(s);
}

/** Extrai o valor depois do primeiro ":" ou "-". */
function valorDepois(linha: string): string {
  const idx = linha.search(/[:\-–]/);
  return idx >= 0 ? linha.slice(idx + 1).trim() : "";
}

/** Converte "05/07" (+ ano) em ISO "YYYY-MM-DD". Rejeita dia/mês inválidos. */
function parseData(valor: string, ano: number): string | null {
  const m = valor.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (!m) return null;
  const d = Number(m[1]);
  const mes = Number(m[2]);
  if (d < 1 || d > 31 || mes < 1 || mes > 12) return null;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Interpreta o texto do planejamento. `ano` é usado para montar as datas
 * (o documento traz só dia/mês).
 */
export function parsePlanejamento(
  texto: string,
  ano: number,
): ItemPlanejamento[] {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const itens: ItemPlanejamento[] = [];
  let semanaAtual: number | null = null;
  let atual: ItemPlanejamento | null = null;
  let corpo: string[] = [];
  let legenda: string[] = [];
  let emLegenda = false;

  const fechar = () => {
    if (atual) {
      atual.roteiro = corpo.join("\n").trim() || null;
      atual.legenda = legenda.join("\n").trim() || null;
      itens.push(atual);
    }
    atual = null;
    corpo = [];
    legenda = [];
    emLegenda = false;
  };

  for (const linha of linhas) {
    const semSep = linha.replace(/#+/g, "").trim();
    if (!semSep) continue;
    // ignora linhas separadoras (só símbolos, ex.: "____", "----")
    if (/^[\W_]+$/.test(semSep)) continue;

    const mSemana = semSep.match(/^SEMANA\s+(\d+)/i);
    if (mSemana) {
      semanaAtual = Number(mSemana[1]);
      continue;
    }

    const mConteudo = semSep.match(/^CONTE[ÚU]DO\s*\d*\s*[:\-–]\s*(.*)$/i);
    if (mConteudo) {
      fechar();
      const resto = mConteudo[1] ?? "";
      // Detecta o formato só pela PRIMEIRA palavra (o formato vem no início:
      // "CONTEÚDO 1: Reel ...") — evita que uma palavra no meio do título
      // (ex.: "Reel sobre vídeo") seja confundida com o formato.
      const primeira = resto.trim().split(/\s+/)[0] ?? "";
      const formato = detectarFormato(primeira) ?? "Reel";
      atual = {
        titulo: limparTitulo(resto),
        formato,
        semana: semanaAtual,
        dataPrevista: null,
        precisaGravacao: !FORMATOS_SEM_GRAVACAO.has(formato),
        local: null,
        vestimenta: null,
        participantes: [],
        link: null,
        observacoes: null,
        roteiro: null,
        legenda: null,
      };
      continue;
    }

    if (!atual) continue;

    // Campos rotulados (não entram no roteiro). Aceita "DATA:", "DATA POSTAGEM:"
    // e "DATA DA POSTAGEM:" (o "DA" é opcional). "DATA DO EVENTO:" NÃO entra.
    if (/^DATA(\s+(DA\s+)?POSTAGEM)?\s*[:\-–]/i.test(semSep)) {
      atual.dataPrevista = parseData(valorDepois(semSep), ano);
      // Sem marcador "SEMANA" no planejamento? Deriva a semana pelo dia do mês
      // (1–7 = semana 1, 8–14 = semana 2, ...), para não deixar vazio.
      if (atual.semana == null && atual.dataPrevista) {
        const dia = Number(atual.dataPrevista.slice(8, 10));
        if (dia >= 1) atual.semana = Math.min(5, Math.ceil(dia / 7));
      }
      continue;
    }
    if (/^LOCAL\s*[:\-–]/i.test(semSep)) {
      atual.local = valorDepois(semSep) || null;
      continue;
    }
    if (/^VESTIMENTA\s*[:\-–]/i.test(semSep)) {
      atual.vestimenta = valorDepois(semSep) || null;
      continue;
    }
    if (/^PARTICIPANTES\s*[:\-–]/i.test(semSep)) {
      atual.participantes = valorDepois(semSep)
        .split(/[,+]/)
        .map((p) => p.trim())
        .filter(Boolean);
      continue;
    }
    // Referência: aceita rótulos com texto extra antes do separador, ex.:
    // "REFERÊNCIA (INSTAGRAM / TIKTOK):" — pega a URL da linha se houver.
    if (/^(REFER[ÊE]NCIA|LINK|REF)\b/i.test(semSep) && /[:\-–]/.test(semSep)) {
      const url = semSep.match(/https?:\/\/\S+/);
      atual.link = url ? url[0] : valorDepois(semSep) || null;
      continue;
    }
    if (/^OBS\s*[:\-–]/i.test(semSep)) {
      atual.observacoes = valorDepois(semSep) || null;
      continue;
    }

    // Link de referência SEM rótulo (Instagram/TikTok/YouTube colado sozinho):
    // captura como referência se ainda não houver uma.
    if (!atual.link) {
      const ref = semSep.match(/https?:\/\/\S*(?:instagram|tiktok|youtu)\S*/i);
      if (ref) {
        atual.link = ref[0];
        // Linha que é só o link (sem outro conteúdo) não entra no roteiro.
        const resto = semSep.replace(ref[0], "").replace(/[\s:–\-]/g, "");
        if (resto.length === 0) continue;
      }
    }

    // Legenda: começa em "LEGENDA:" e vai até "DIRECIONAMENTO DE STORIES"
    if (/^LEGENDA\s*[:\-–]/i.test(semSep)) {
      emLegenda = true;
      const v = valorDepois(semSep);
      if (v) legenda.push(v);
      corpo.push(semSep);
      continue;
    }
    if (/DIRECIONAMENTO\s+DE\s+STORIES/i.test(semSep)) {
      emLegenda = false;
      corpo.push(semSep);
      continue;
    }

    // Demais linhas: corpo (roteiro). Se estiver na legenda, acumula também.
    corpo.push(semSep);
    if (emLegenda) legenda.push(semSep);
  }

  fechar();
  return itens;
}
