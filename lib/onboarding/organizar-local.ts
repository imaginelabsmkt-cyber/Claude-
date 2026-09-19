/**
 * Organiza o texto colado do onboard nos campos do DNA, SEM IA — roda no
 * próprio sistema. Lida com dois formatos:
 *
 *  1) CSV do Google Forms (uma linha de perguntas + uma linha de respostas,
 *     campos entre aspas, com quebras de linha dentro). As perguntas mudam de
 *     cliente para cliente, então o encaixe é por palavras-chave no enunciado.
 *  2) Texto solto com rótulos ("Público-alvo: ...", "Tom de voz: ...").
 *
 * Nada se perde: o que não casa com um campo conhecido vira "Sobre" ou "Outras
 * observações". Colunas de acesso/senha do formulário NUNCA são importadas.
 */

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function semAcento(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** `alias` aparece como palavra/expressão em `texto` (ambos já normalizados). */
function contemPalavra(texto: string, alias: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${escaparRegex(alias)}([^a-z0-9]|$)`).test(
    texto,
  );
}

/* ------------------------------------------------------------------ */
/* Mapa de campos                                                     */
/* ------------------------------------------------------------------ */

/**
 * Palavras/expressões (sem acento) que indicam cada campo. Vale para rótulos
 * curtos ("Tom de voz:") e para perguntas longas do formulário. O enunciado é
 * classificado pelo alias MAIS LONGO que casar (mais específico ganha).
 */
const ALIASES: Record<string, string[]> = {
  marca: ["nome completo", "nome da marca", "nome do negocio", "nome da empresa", "marca"],
  segmento: ["segmento", "nicho", "ramo", "area de atuacao"],
  responsavel_cliente: [
    "contato principal",
    "responsavel pelo cliente",
    "contato do cliente",
    "quem responde",
  ],
  // "instagram" sozinho é ruído (aparece em quase toda pergunta do formulário).
  instagram: ["perfil do instagram", "arroba do cliente", "@"],
  cidade: ["cidade", "regiao", "localizacao", "onde fica"],
  inicio: ["cliente desde", "cliente a partir", "comeco do contrato", "desde quando"],
  sobre: [
    "o que diferencia",
    "diferencia o seu trabalho",
    "diferencial",
    "servicos voce oferece",
    "servico mais procurado",
    "quais servicos",
    "o que faz",
    "descricao do negocio",
    "apresentacao",
    "resumo do negocio",
    "sobre o cliente",
    "sobre a marca",
    "sobre o negocio",
    "sobre",
  ],
  publico: [
    "quem decide te contratar",
    "quem e a pessoa que decide",
    "o que esse decisor procura",
    "porte das empresas",
    "segmentos de empresa",
    "quem quer atrair",
    "publico-alvo",
    "publico alvo",
    "publico",
    "para quem",
    "persona",
    "cliente ideal",
    "audiencia",
    "decisor",
  ],
  dores: [
    "principal dor",
    "qual e a dor",
    "dor da empresa",
    "dores e objecoes",
    "dores",
    "objecoes",
    "dificuldade",
  ],
  desejos: ["desejos e sonhos", "desejos", "sonhos", "o que querem", "aspiracoes"],
  tom: [
    "tom de voz",
    "personalidade da",
    "descreveriam a personalidade",
    "linguagem",
    "jeito de falar",
    "tom",
  ],
  estilo: [
    "identidade visual",
    "brand guide",
    "estilo visual",
    "referencias esteticas",
    "estetica",
    "logo",
    "estilo",
  ],
  pilares: [
    "temas voce quer falar",
    "quais temas",
    "temas que quer",
    "pilares de conteudo",
    "pilares",
    "linhas de conteudo",
    "assuntos",
    "temas",
  ],
  fazer: [
    "confortavel com",
    "o que sempre fazer",
    "sempre fazer",
    "o que fazer",
    "boas praticas",
  ],
  evitar: [
    "o que voces nao querem",
    "o que voce nao quer",
    "nao querem no conteudo",
    "nao quer no conteudo",
    "nao quer que aconteca",
    "de jeito nenhum",
    "se arrependeu",
    "nao gostou",
    "o que nao quer",
    "o que evitar",
    "nao querem",
    "nao fazer",
    "evitar",
  ],
  objetivo: [
    "principal objetivo",
    "objetivo com o instagram",
    "que as pessoas pensem",
    "quer destacar e vender",
    "mais quer destacar",
    "objetivo",
    "proposito",
  ],
  metas: [
    "bom resultado",
    "quantos clientes",
    "resultado com esse planejamento",
    "metas",
    "meta",
    "kpis",
    "indicadores",
  ],
  norte: [
    "onde queremos chegar",
    "onde quer chegar",
    "visao de longo prazo",
    "longo prazo",
    "medio prazo",
    "norte",
  ],
  referencias: [
    "admira e quer como referencia",
    "perfis de referencia",
    "perfis que voce admira",
    "referencias",
    "referencia",
    "inspiracoes",
    "inspiracao",
  ],
  concorrentes: ["concorrentes diretos", "concorrentes", "concorrencia", "competidores"],
  observacoes: [
    "gostaria de deixar alguma observacao",
    "outras observacoes",
    "observacoes",
    "observacao",
    "outras informacoes",
    "informacoes adicionais",
    "notas",
  ],
};

/**
 * Colunas de acesso/operacionais que NÃO entram no DNA (e nunca importam
 * login/senha). Se o enunciado casar aqui, a coluna é ignorada.
 */
const IGNORAR: string[] = [
  "login",
  "senha",
  "acesso",
  "conta no facebook",
  "meta business",
  "meta bunisess",
  "meta ads",
  "anuncios",
  "anuncio",
  "conta de anuncios",
  "forma de conceder",
  "carimbo de data",
  "nome de usuario",
];

/** Acha o id de campo cujo alias (mais longo) casa no enunciado. */
function idPorRotulo(rotuloNorm: string): string | null {
  if (IGNORAR.some((p) => rotuloNorm.includes(p))) return null;
  let melhor: { id: string; len: number } | null = null;
  for (const [id, aliases] of Object.entries(ALIASES)) {
    for (const a of aliases) {
      const casa = a.length >= 4 ? contemPalavra(rotuloNorm, a) : rotuloNorm === a;
      if (casa && (!melhor || a.length > melhor.len)) melhor = { id, len: a.length };
    }
  }
  return melhor?.id ?? null;
}

function ehColunaIgnorada(rotuloNorm: string): boolean {
  return IGNORAR.some((p) => rotuloNorm.includes(p));
}

/* ------------------------------------------------------------------ */
/* Formato 1: CSV (Google Forms)                                      */
/* ------------------------------------------------------------------ */

/** Parser de CSV (aspas, "" como aspa literal, quebras de linha no campo). */
function parseCSV(texto: string): string[][] {
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let entreAspas = false;
  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];
    if (entreAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i += 1;
        } else {
          entreAspas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }
    if (c === '"') entreAspas = true;
    else if (c === ",") {
      linha.push(campo);
      campo = "";
    } else if (c === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else if (c !== "\r") {
      campo += c;
    }
  }
  linha.push(campo);
  linhas.push(linha);
  return linhas.filter((r) => r.some((f) => f.trim() !== ""));
}

/** Heurística: parece o CSV de um formulário (cabeçalho largo + respostas). */
function pareceCSV(texto: string): boolean {
  if (!texto.includes(",")) return false;
  const linhas = parseCSV(texto);
  return linhas.length >= 2 && linhas[0].length >= 4;
}

function organizarCSV(texto: string): Record<string, string> {
  const linhas = parseCSV(texto);
  const cabecalho = linhas[0];
  // Primeira linha de resposta com algum conteúdo (o onboard é de um cliente).
  const resposta =
    linhas.slice(1).find((r) => r.some((v) => v.trim() !== "")) ?? [];

  const acumulado: Record<string, string[]> = {};
  for (let i = 0; i < cabecalho.length; i += 1) {
    const pergunta = (cabecalho[i] ?? "").trim();
    const valor = (resposta[i] ?? "").trim();
    if (!pergunta || !valor) continue;
    const rotuloNorm = semAcento(pergunta);
    if (ehColunaIgnorada(rotuloNorm)) continue; // acesso/senha/ops
    const id = idPorRotulo(rotuloNorm) ?? "observacoes";
    acumulado[id] ??= [];
    // No catch-all, guarda o par pergunta/resposta pra não virar sopa de texto.
    acumulado[id].push(
      id === "observacoes" ? `${pergunta.replace(/\s+/g, " ").trim()}: ${valor}` : valor,
    );
  }

  const campos: Record<string, string> = {};
  for (const [id, arr] of Object.entries(acumulado)) {
    const v = arr.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
    if (v) campos[id] = v;
  }
  return campos;
}

/* ------------------------------------------------------------------ */
/* Formato 2: texto solto com rótulos                                 */
/* ------------------------------------------------------------------ */

type Deteccao =
  | { id: string; valor: string }
  | { desconhecido: true; valor: string }
  | null;

function detectarRotulo(linha: string): Deteccao {
  const idxSep = linha.search(/[:?]/);
  if (idxSep > 0 && idxSep <= 45) {
    const esquerda = linha.slice(0, idxSep).trim();
    const direita = linha.slice(idxSep + 1).trim();
    if (!direita.startsWith("//")) {
      const norm = semAcento(esquerda);
      if (ehColunaIgnorada(norm)) return { desconhecido: true, valor: "" };
      const id = idPorRotulo(norm);
      if (id) return { id, valor: direita };
      if (/[a-zà-ú]/i.test(esquerda)) {
        return {
          desconhecido: true,
          valor: direita ? `${esquerda}: ${direita}` : "",
        };
      }
    }
  }
  if (linha.length <= 45) {
    const id = idPorRotulo(semAcento(linha.replace(/[?:]+$/, "")));
    if (id) return { id, valor: "" };
  }
  return null;
}

function organizarLinhas(texto: string): Record<string, string> {
  const acumulado: Record<string, string[]> = {};
  const solto: string[] = [];
  let atual: string | null = null;

  const empurrar = (id: string, v: string) => {
    acumulado[id] ??= [];
    if (v) acumulado[id].push(v);
  };

  for (const bruta of texto.split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha) {
      if (atual && acumulado[atual]?.length) acumulado[atual].push("");
      continue;
    }
    const det = detectarRotulo(linha);
    if (det && "id" in det) {
      atual = det.id;
      empurrar(atual, det.valor);
    } else if (det) {
      atual = "observacoes";
      empurrar(atual, det.valor);
    } else if (atual) {
      acumulado[atual].push(linha);
    } else {
      solto.push(linha);
    }
  }

  const campos: Record<string, string> = {};
  for (const [id, arr] of Object.entries(acumulado)) {
    const v = arr.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (v) campos[id] = v;
  }

  // Instagram: pega o @ se não veio rotulado.
  if (!campos.instagram) {
    const m = texto.match(/@[a-zA-Z0-9._]{2,}/);
    if (m) campos.instagram = m[0];
  }

  const restante = solto.join("\n").trim();
  if (restante) {
    if (!campos.sobre) campos.sobre = restante;
    else
      campos.observacoes = [campos.observacoes, restante]
        .filter(Boolean)
        .join("\n\n");
  }

  return campos;
}

/* ------------------------------------------------------------------ */

export function organizarTextoLocal(texto: string): Record<string, string> {
  return pareceCSV(texto) ? organizarCSV(texto) : organizarLinhas(texto);
}
