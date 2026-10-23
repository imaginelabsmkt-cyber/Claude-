import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { renovarAccessToken, GoogleRevogadoError } from "@/lib/google/oauth";
import { FONTES_CONTATO } from "@/types";
import type { MetricaTrafego } from "@/types";

/**
 * Sincroniza os RESULTADOS da semana numa planilha do Google Sheets, UMA por
 * cliente, criada automaticamente no Drive da conta conectada da agência.
 * Mão única (sistema -> planilha), "melhor esforço": nunca quebra a ação.
 *
 * A planilha é feita pra ser vista pelo CLIENTE também, então é bem formatada:
 *  - UMA ABA POR MÊS ("Outubro de 2026"), semanas como linhas;
 *  - título, duas faixas de cabeçalho ("Relatório favie (tráfego pago)" e
 *    "Preenchido pelo cliente"), linhas/colunas congeladas, moeda/número e
 *    larguras de coluna ajustadas.
 *
 * Reúne as DUAS fontes de dados na mesma linha: o relatório que a favie sobe
 * (tráfego) e o que o cliente preenche no painel (origem dos contatos).
 */

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";

// ------------------------------------------------------------------
// Modelo de colunas (ordem importa; agrupadas por quem preenche)
// ------------------------------------------------------------------
/** Colunas do relatório da favie (tráfego do Meta + nota da equipe). */
const COLS_FAVIE = [
  "Investimento",
  "Pessoas alcançadas",
  "Impressões",
  "Visitas à página",
  "Conversas iniciadas",
  "Nota da equipe",
] as const;

/** Colunas preenchidas pelo cliente (origem dos contatos + retorno). */
function colsCliente(): string[] {
  return [
    ...FONTES_CONTATO.map((f) => `Contatos: ${f}`),
    "Total de contatos",
    "Viraram cliente (tráfego)",
    "Viraram cliente (orgânico)",
    "Comentário do cliente",
  ];
}

const N_FAVIE = COLS_FAVIE.length; // 6
const N_FONTES = FONTES_CONTATO.length; // 6
const N_CLI = colsCliente().length; // fontes + 3
const N_COLS = 1 + N_FAVIE + N_CLI + 1; // Semana + favie + cliente + Atualizado

const IDX_SEMANA = 0;
const IDX_FAVIE_INI = 1;
const IDX_FAVIE_FIM = IDX_FAVIE_INI + N_FAVIE; // exclusivo
const IDX_CLI_INI = IDX_FAVIE_FIM;
const IDX_CLI_FIM = IDX_CLI_INI + N_CLI; // exclusivo
const IDX_ATUAL = N_COLS - 1;
const LINHA_DADOS = 4; // 1ª linha de dados (1-based): 3 linhas de cabeçalho

/** Cor no formato do Sheets (0..1). */
function rgb(r: number, g: number, b: number) {
  return { red: r / 255, green: g / 255, blue: b / 255 };
}
const COR_TITULO = rgb(106, 35, 54); // marsala favie
const COR_FAVIE = rgb(244, 225, 231); // rosado claro (seção favie)
const COR_FAVIE_SUB = rgb(249, 238, 242); // rosado bem claro (nomes das colunas)
const COR_CLIENTE = rgb(246, 229, 198); // dourado claro (seção cliente)
const COR_CLIENTE_SUB = rgb(251, 243, 227); // dourado bem claro (nomes das colunas)
const COR_HEADER = rgb(238, 228, 216); // bege (Semana / Atualizado)
const COR_BANDA = rgb(250, 245, 238); // creme (linha alternada)
const BRANCO = rgb(255, 255, 255);
const TINTA = rgb(58, 16, 32); // vinho quase preto (texto)
const FONTE = "Montserrat"; // fonte limpa e profissional (cai no padrão se faltar)

/** Range em A1 com a aba entre aspas (nomes com espaço/acento). */
function range(aba: string, a1: string): string {
  return `'${aba.replace(/'/g, "''")}'!${a1}`;
}

/**
 * Mês da semana (a quinta-feira define o mês, igual ao resto do sistema).
 * Devolve o nome da aba ("Outubro de 2026").
 */
function abaDoMes(weekStart: string): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const dt = new Date(y, m - 1, d + 3);
  const nome = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(dt);
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

/** Acha a conta Google conectada da agência e devolve um access_token. */
async function tokenAgencia(admin: Admin): Promise<string | null> {
  const { data } = await admin
    .from("google_accounts")
    .select("refresh_token, revoked_at, updated_at")
    .is("revoked_at", null)
    .not("refresh_token", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1);
  const conta = data?.[0];
  if (!conta?.refresh_token) return null;
  try {
    return await renovarAccessToken(conta.refresh_token);
  } catch (e) {
    if (e instanceof GoogleRevogadoError) return null;
    return null;
  }
}

async function gapi(
  token: string,
  url: string,
  method: string,
  body?: unknown,
): Promise<Response> {
  return fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Escreve valores num range (values.update, USER_ENTERED). */
async function escrever(
  token: string,
  sheetId: string,
  rng: string,
  valores: (string | number)[][],
): Promise<boolean> {
  const url = `${SHEETS}/${sheetId}/values/${encodeURIComponent(rng)}?valueInputOption=USER_ENTERED`;
  const resp = await gapi(token, url, "PUT", { values: valores });
  return resp.ok;
}

/** As 3 linhas de cabeçalho (título, faixas de seção, nomes das colunas). */
function cabecalho(clienteNome: string, aba: string): (string | number)[][] {
  const linhaTitulo = new Array(N_COLS).fill("");
  linhaTitulo[0] = `favie · Resultados de ${clienteNome} · ${aba}`;

  const linhaSecoes = new Array(N_COLS).fill("");
  linhaSecoes[IDX_SEMANA] = "Semana";
  linhaSecoes[IDX_FAVIE_INI] = "Relatório favie (tráfego pago)";
  linhaSecoes[IDX_CLI_INI] = "Preenchido pelo cliente";
  linhaSecoes[IDX_ATUAL] = "Atualizado em";

  const linhaColunas = new Array(N_COLS).fill("");
  COLS_FAVIE.forEach((c, k) => (linhaColunas[IDX_FAVIE_INI + k] = c));
  colsCliente().forEach((c, k) => (linhaColunas[IDX_CLI_INI + k] = c));

  return [linhaTitulo, linhaSecoes, linhaColunas];
}

/** Monta a linha da semana (mesma ordem das colunas). */
function montarLinha(
  weekStart: string,
  res: {
    metrics?: MetricaTrafego[] | null;
    sources_breakdown?: Record<string, number> | null;
    closed_traffic?: number | null;
    closed_organic?: number | null;
    client_comment?: string | null;
    team_note?: string | null;
  } | null,
): (string | number)[] {
  const metricMap = new Map((res?.metrics ?? []).map((m) => [m.label, m.value]));
  const bd = res?.sources_breakdown ?? {};
  const total = Object.values(bd).reduce((a, b) => a + (Number(b) || 0), 0);
  return [
    weekStart,
    // favie (tráfego)
    metricMap.get("Investimento") ?? "",
    metricMap.get("Pessoas alcançadas") ?? "",
    metricMap.get("Impressões") ?? "",
    metricMap.get("Visitas à página") ?? "",
    metricMap.get("Conversas iniciadas") ?? "",
    res?.team_note ?? "",
    // cliente (origem dos contatos + retorno)
    ...FONTES_CONTATO.map((f) => Number(bd[f] ?? 0)),
    total,
    res?.closed_traffic ?? "",
    res?.closed_organic ?? "",
    res?.client_comment ?? "",
    // controle
    new Date().toISOString().slice(0, 10),
  ];
}

/** Linha de resultado de uma semana (do banco), pro resumo do mês. */
interface LinhaResMes {
  week_start: string;
  metrics?: MetricaTrafego[] | null;
  sources_breakdown?: Record<string, number> | null;
  closed_traffic?: number | null;
  closed_organic?: number | null;
  client_comment?: string | null;
  team_note?: string | null;
}

/** Última coluna (A1) a partir da contagem de colunas (1-based). */
function colLetter(n: number): string {
  let s = "";
  let x = n;
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

/** Lê um número em pt-BR ("R$ 1.234,56", "4.012", "3,5%") pra somar o mês. */
function parseNumBR(v: string | number | null | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (!v) return 0;
  let t = String(v).replace(/\s/g, "").replace(/[^0-9.,-]/g, "");
  if (!t || t === "-") return 0;
  if (t.includes(",") && t.includes(".")) t = t.replace(/\./g, "").replace(",", ".");
  else if (t.includes(",")) t = t.replace(",", ".");
  else if (t.includes(".")) {
    const partes = t.split(".");
    if (partes.length > 2 || partes[partes.length - 1].length === 3)
      t = t.replace(/\./g, "");
  }
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Linha de TOTAL DO MÊS: soma as semanas (tráfego + retorno do cliente). Fecha
 * o mês sozinho conforme as semanas vão entrando.
 */
function montarTotalMes(rows: LinhaResMes[]): (string | number)[] {
  const somaMetrica = (label: string) =>
    rows.reduce((acc, r) => {
      const val = (r.metrics ?? []).find((m) => m.label === label)?.value;
      return acc + parseNumBR(val);
    }, 0);
  const somaFonte = (f: string) =>
    rows.reduce((a, r) => a + Number(r.sources_breakdown?.[f] ?? 0), 0);
  const fontes = FONTES_CONTATO.map((f) => somaFonte(f));
  const totalContatos = fontes.reduce((a, b) => a + b, 0);
  const ct = rows.reduce((a, r) => a + Number(r.closed_traffic ?? 0), 0);
  const co = rows.reduce((a, r) => a + Number(r.closed_organic ?? 0), 0);
  return [
    "Total do mês",
    somaMetrica("Investimento"),
    somaMetrica("Pessoas alcançadas"),
    somaMetrica("Impressões"),
    somaMetrica("Visitas à página"),
    somaMetrica("Conversas iniciadas"),
    "",
    ...fontes,
    totalContatos,
    ct,
    co,
    "",
    new Date().toISOString().slice(0, 10),
  ];
}

/** Todas as semanas (do banco) que caem no mês da aba. */
async function linhasDoMes(
  admin: Admin,
  clientId: string,
  aba: string,
): Promise<LinhaResMes[]> {
  const { data } = await admin
    .from("client_monthly_results")
    .select(
      "week_start, metrics, sources_breakdown, closed_traffic, closed_organic, client_comment, team_note",
    )
    .eq("client_id", clientId);
  return ((data as LinhaResMes[] | null) ?? []).filter(
    (r) => r.week_start && abaDoMes(r.week_start) === aba,
  );
}

/** Grupos de requests de formatação (um batch por grupo, resiliente). */
function gruposFormato(gid: number) {
  const gridHeader = (sr: number, er: number, sc: number, ec: number) => ({
    sheetId: gid,
    startRowIndex: sr,
    endRowIndex: er,
    startColumnIndex: sc,
    endColumnIndex: ec,
  });
  const cell = (
    bg: { red: number; green: number; blue: number },
    opts: {
      bold?: boolean;
      size?: number;
      fg?: typeof BRANCO;
      center?: boolean;
      wrap?: boolean;
    } = {},
  ) => ({
    userEnteredFormat: {
      backgroundColor: bg,
      horizontalAlignment: opts.center ? "CENTER" : "LEFT",
      verticalAlignment: "MIDDLE",
      wrapStrategy: opts.wrap ? "WRAP" : "OVERFLOW_CELL",
      padding: { top: 2, right: 8, bottom: 2, left: 8 },
      textFormat: {
        bold: !!opts.bold,
        fontSize: opts.size ?? 10,
        fontFamily: FONTE,
        foregroundColor: opts.fg ?? TINTA,
      },
    },
  });
  const repeat = (
    r: ReturnType<typeof gridHeader>,
    c: ReturnType<typeof cell>,
  ) => ({
    repeatCell: { range: r, cell: c, fields: "userEnteredFormat" },
  });
  const numFmt = (sc: number, ec: number, pattern: string) => ({
    repeatCell: {
      range: gridHeader(LINHA_DADOS - 1, 1000, sc, ec),
      cell: { userEnteredFormat: { numberFormat: { type: "NUMBER", pattern } } },
      fields: "userEnteredFormat.numberFormat",
    },
  });
  // Estilo das células de DADOS (fonte, alinhamento, quebra), sem mexer no
  // número nem no fundo (banda cuida do fundo).
  const dados = (
    sc: number,
    ec: number,
    center: boolean,
    wrap = false,
  ) => ({
    repeatCell: {
      range: gridHeader(LINHA_DADOS - 1, 1000, sc, ec),
      cell: {
        userEnteredFormat: {
          horizontalAlignment: center ? "CENTER" : "LEFT",
          verticalAlignment: "MIDDLE",
          wrapStrategy: wrap ? "WRAP" : "OVERFLOW_CELL",
          padding: { top: 2, right: 8, bottom: 2, left: 8 },
          textFormat: { fontFamily: FONTE, fontSize: 10, foregroundColor: TINTA },
        },
      },
      fields:
        "userEnteredFormat(horizontalAlignment,verticalAlignment,wrapStrategy,padding,textFormat(fontFamily,fontSize,foregroundColor))",
    },
  });
  const largura = (sc: number, ec: number, px: number) => ({
    updateDimensionProperties: {
      range: { sheetId: gid, dimension: "COLUMNS", startIndex: sc, endIndex: ec },
      properties: { pixelSize: px },
      fields: "pixelSize",
    },
  });
  const altura = (sr: number, er: number, px: number) => ({
    updateDimensionProperties: {
      range: { sheetId: gid, dimension: "ROWS", startIndex: sr, endIndex: er },
      properties: { pixelSize: px },
      fields: "pixelSize",
    },
  });

  // Grupos independentes: cada grupo vai num batch próprio, então se um falhar
  // (ex.: uma propriedade nova não aceita), os OUTROS ainda são aplicados. Antes
  // ia tudo num lote só e um erro derrubava a formatação inteira.
  return [
    // 1) Propriedades da aba + alturas + larguras.
    [
      {
        updateSheetProperties: {
          properties: {
            sheetId: gid,
            tabColor: COR_TITULO,
            gridProperties: {
              frozenRowCount: 3,
              frozenColumnCount: 1,
              hideGridlines: true,
            },
          },
          fields:
            "tabColor,gridProperties(frozenRowCount,frozenColumnCount,hideGridlines)",
        },
      },
      altura(0, 1, 44),
      altura(1, 2, 24),
      altura(2, 3, 38),
      largura(IDX_SEMANA, IDX_SEMANA + 1, 110),
      largura(IDX_FAVIE_INI, IDX_FAVIE_INI + 5, 115),
      largura(IDX_FAVIE_INI + 5, IDX_FAVIE_INI + 6, 220),
      largura(IDX_CLI_INI, IDX_CLI_FIM - 1, 120),
      largura(IDX_CLI_FIM - 1, IDX_CLI_FIM, 260),
      largura(IDX_ATUAL, IDX_ATUAL + 1, 110),
    ],
    // 2) Merges do cabeçalho.
    [
      { mergeCells: { range: gridHeader(0, 1, 0, N_COLS), mergeType: "MERGE_ALL" } },
      { mergeCells: { range: gridHeader(1, 3, IDX_SEMANA, IDX_SEMANA + 1), mergeType: "MERGE_ALL" } },
      { mergeCells: { range: gridHeader(1, 2, IDX_FAVIE_INI, IDX_FAVIE_FIM), mergeType: "MERGE_ALL" } },
      { mergeCells: { range: gridHeader(1, 2, IDX_CLI_INI, IDX_CLI_FIM), mergeType: "MERGE_ALL" } },
      { mergeCells: { range: gridHeader(1, 3, IDX_ATUAL, IDX_ATUAL + 1), mergeType: "MERGE_ALL" } },
    ],
    // 3) Estilos das linhas de cabeçalho.
    [
      repeat(gridHeader(0, 1, 0, N_COLS), cell(COR_TITULO, { bold: true, size: 14, fg: BRANCO, center: true })),
      repeat(gridHeader(1, 3, IDX_SEMANA, IDX_SEMANA + 1), cell(COR_HEADER, { bold: true, center: true, wrap: true })),
      repeat(gridHeader(1, 2, IDX_FAVIE_INI, IDX_FAVIE_FIM), cell(COR_FAVIE, { bold: true, center: true, fg: COR_TITULO })),
      repeat(gridHeader(2, 3, IDX_FAVIE_INI, IDX_FAVIE_FIM), cell(COR_FAVIE_SUB, { bold: true, center: true, wrap: true })),
      repeat(gridHeader(1, 2, IDX_CLI_INI, IDX_CLI_FIM), cell(COR_CLIENTE, { bold: true, center: true, fg: COR_TITULO })),
      repeat(gridHeader(2, 3, IDX_CLI_INI, IDX_CLI_FIM), cell(COR_CLIENTE_SUB, { bold: true, center: true, wrap: true })),
      repeat(gridHeader(1, 3, IDX_ATUAL, IDX_ATUAL + 1), cell(COR_HEADER, { bold: true, center: true, wrap: true })),
    ],
    // 4) Estilo dos dados + formatos de número.
    [
      dados(IDX_SEMANA, IDX_SEMANA + 1, true),
      dados(IDX_FAVIE_INI, IDX_FAVIE_INI + 5, true),
      dados(IDX_FAVIE_INI + 5, IDX_FAVIE_INI + 6, false, true),
      dados(IDX_CLI_INI, IDX_CLI_FIM - 1, true),
      dados(IDX_CLI_FIM - 1, IDX_CLI_FIM, false, true),
      dados(IDX_ATUAL, IDX_ATUAL + 1, true),
      numFmt(IDX_FAVIE_INI, IDX_FAVIE_INI + 1, '"R$" #,##0.00'),
      numFmt(IDX_FAVIE_INI + 1, IDX_FAVIE_INI + 5, "#,##0"),
      numFmt(IDX_CLI_INI, IDX_CLI_INI + N_FONTES + 3, "#,##0"),
    ],
    // 5) Zebra nos dados.
    [
      {
        addBanding: {
          bandedRange: {
            range: gridHeader(LINHA_DADOS - 1, 1000, 0, N_COLS),
            rowProperties: {
              firstBandColor: BRANCO,
              secondBandColor: COR_BANDA,
            },
          },
        },
      },
    ],
    // 6) Linha fina marsala separando cabeçalho dos dados.
    [
      {
        updateBorders: {
          range: gridHeader(2, 3, 0, N_COLS),
          bottom: { style: "SOLID_MEDIUM", color: COR_TITULO },
        },
      },
    ],
  ];
}

/** Envia um batch de requests; registra erro sem derrubar o resto. */
async function enviarBatch(
  token: string,
  sheetId: string,
  requests: unknown[],
): Promise<void> {
  if (requests.length === 0) return;
  try {
    const r = await gapi(token, `${SHEETS}/${sheetId}:batchUpdate`, "POST", {
      requests,
    });
    if (!r.ok) {
      console.error(
        "Sheets formato (batch) falhou:",
        r.status,
        await r.text().catch(() => ""),
      );
    }
  } catch (e) {
    console.error("Sheets formato (batch) erro:", e);
  }
}

/** Ids das faixas zebradas (banding) já existentes nesta aba. */
async function bandingsDaAba(
  token: string,
  sheetId: string,
  gid: number,
): Promise<number[]> {
  const r = await gapi(
    token,
    `${SHEETS}/${sheetId}?fields=sheets(properties.sheetId,bandedRanges(bandedRangeId))`,
    "GET",
  );
  if (!r.ok) return [];
  const j = (await r.json()) as {
    sheets?: {
      properties?: { sheetId?: number };
      bandedRanges?: { bandedRangeId?: number }[];
    }[];
  };
  const aba = (j.sheets ?? []).find((s) => s.properties?.sheetId === gid);
  return (aba?.bandedRanges ?? [])
    .map((b) => b.bandedRangeId)
    .filter((x): x is number => x != null);
}

/**
 * (Re)aplica o cabeçalho e a formatação favie na aba. Funciona tanto numa aba
 * nova quanto numa que já existe (auto-corrige o visual). Limpa merges e faixas
 * antigas primeiro pra não conflitar, e aplica em grupos independentes, então um
 * erro num grupo não impede os outros.
 */
async function aplicarFormato(
  token: string,
  sheetId: string,
  gid: number,
  aba: string,
  clienteNome: string,
): Promise<void> {
  // Cabeçalho (atualiza também o título caso tenha mudado).
  await escrever(token, sheetId, range(aba, "A1"), cabecalho(clienteNome, aba));

  // Desfaz merges e faixas antigas do cabeçalho/dados pra reaplicar limpo.
  await enviarBatch(token, sheetId, [
    {
      unmergeCells: {
        range: {
          sheetId: gid,
          startRowIndex: 0,
          endRowIndex: 3,
          startColumnIndex: 0,
          endColumnIndex: N_COLS,
        },
      },
    },
  ]);
  const bandings = await bandingsDaAba(token, sheetId, gid);
  if (bandings.length > 0) {
    await enviarBatch(
      token,
      sheetId,
      bandings.map((id) => ({ deleteBanding: { bandedRangeId: id } })),
    );
  }

  // Aplica cada grupo em seu próprio batch.
  for (const grupo of gruposFormato(gid)) {
    await enviarBatch(token, sheetId, grupo as unknown[]);
  }
}

/**
 * Garante que a aba do mês existe e está formatada. Devolve o gid (numérico) ou
 * null. Cria se faltar e SEMPRE reaplica o visual favie (corrige abas antigas).
 */
async function garantirAbaMes(
  token: string,
  sheetId: string,
  aba: string,
  clienteNome: string,
): Promise<number | null> {
  const meta = await gapi(
    token,
    `${SHEETS}/${sheetId}?fields=sheets.properties(sheetId,title)`,
    "GET",
  );
  if (!meta.ok) return null;
  const mj = (await meta.json()) as {
    sheets?: { properties?: { sheetId?: number; title?: string } }[];
  };
  const abas = mj.sheets ?? [];
  const existente = abas.find((s) => s.properties?.title === aba);

  if (existente?.properties?.sheetId != null) {
    // Aba já existe: reaplica o visual (corrige o que ficou sem formatação).
    const gid = existente.properties.sheetId;
    await aplicarFormato(token, sheetId, gid, aba, clienteNome);
    return gid;
  }

  // Cria a aba do mês.
  const add = await gapi(token, `${SHEETS}/${sheetId}:batchUpdate`, "POST", {
    requests: [{ addSheet: { properties: { title: aba } } }],
  });
  if (!add.ok) return null;
  const aj = (await add.json()) as {
    replies?: { addSheet?: { properties?: { sheetId?: number } } }[];
  };
  const gid = aj.replies?.[0]?.addSheet?.properties?.sheetId;
  if (gid == null) return null;

  // Remove a aba padrão vazia ("Página1"/"Sheet1"), em batch separado pra não
  // arriscar a formatação.
  const padrao = abas.find(
    (s) =>
      s.properties?.title &&
      /^(sheet1|página1|planilha1|page1)$/i.test(s.properties.title),
  );
  if (padrao?.properties?.sheetId != null) {
    await enviarBatch(token, sheetId, [
      { deleteSheet: { sheetId: padrao.properties.sheetId } },
    ]);
  }

  // Cabeçalho + formatação (resiliente, por grupos).
  await aplicarFormato(token, sheetId, gid, aba, clienteNome);

  return gid;
}

/**
 * Garante a planilha do cliente: devolve o id. Cria se ainda não existir e
 * guarda o id/url no cliente. A formatação das abas é feita em garantirAbaMes.
 */
async function garantirPlanilha(
  admin: Admin,
  token: string,
  clientId: string,
): Promise<{ id: string; nome: string } | null> {
  const { data: cli } = await admin
    .from("clients")
    .select("name, results_sheet_id")
    .eq("id", clientId)
    .maybeSingle();
  if (!cli) return null;
  if (cli.results_sheet_id) return { id: cli.results_sheet_id, nome: cli.name };

  const resp = await gapi(token, SHEETS, "POST", {
    properties: { title: `Resultados de ${cli.name} · favie` },
  });
  if (!resp.ok) return null;
  const j = (await resp.json()) as {
    spreadsheetId?: string;
    spreadsheetUrl?: string;
  };
  const id = j.spreadsheetId;
  if (!id) return null;

  // Deixa a planilha "quem tem o link, vê" pra ela poder ser aberta pelo
  // cliente a partir do painel (botão "Abrir planilha"). Melhor esforço.
  try {
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${id}/permissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "reader", type: "anyone" }),
      },
    );
  } catch {
    /* sem permissão de Drive ainda: a planilha é criada mesmo assim */
  }

  await admin
    .from("clients")
    .update({ results_sheet_id: id, results_sheet_url: j.spreadsheetUrl ?? null })
    .eq("id", clientId);
  return { id, nome: cli.name };
}

/**
 * Sincroniza a linha da semana na ABA DO MÊS da planilha do cliente. Upsert:
 * acha a semana pela coluna A da aba e atualiza; se não existir, acrescenta.
 */
export async function sincronizarResultadoSheets(
  clientId: string,
  weekStart: string,
): Promise<void> {
  try {
    if (!clientId || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return;
    const admin = createAdminClient();
    if (!admin) return;
    const token = await tokenAgencia(admin);
    if (!token) return; // Google não conectado / sem permissão de planilhas

    const planilha = await garantirPlanilha(admin, token, clientId);
    if (!planilha) return;

    const aba = abaDoMes(weekStart);
    const gid = await garantirAbaMes(token, planilha.id, aba, planilha.nome);
    if (gid == null) return;

    // Reconstrói a aba do mês a partir do banco: uma linha por semana
    // (ordenadas) + uma linha de TOTAL DO MÊS somando as semanas. Assim o
    // resumo semanal e o mensal ficam na mesma planilha e o mês fecha sozinho.
    const doMes = await linhasDoMes(admin, clientId, aba);
    doMes.sort((a, b) => a.week_start.localeCompare(b.week_start));
    const linhasSemana = doMes.map((r) => montarLinha(r.week_start, r));
    const bloco: (string | number)[][] =
      linhasSemana.length > 0
        ? [...linhasSemana, montarTotalMes(doMes)]
        : [];

    // Limpa a área de dados e regrava o bloco (semanas + total).
    const areaDados = range(aba, `A${LINHA_DADOS}:${colLetter(N_COLS)}1000`);
    await gapi(
      token,
      `${SHEETS}/${planilha.id}/values/${encodeURIComponent(areaDados)}:clear`,
      "POST",
      {},
    );
    if (bloco.length > 0) {
      await escrever(token, planilha.id, range(aba, `A${LINHA_DADOS}`), bloco);
      // Destaca a linha de total do mês: faixa marsala clara, negrito marsala e
      // uma linha fina em cima separando das semanas.
      const totalRow0 = LINHA_DADOS - 1 + linhasSemana.length; // 0-based
      await gapi(token, `${SHEETS}/${planilha.id}:batchUpdate`, "POST", {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: gid,
                startRowIndex: totalRow0,
                endRowIndex: totalRow0 + 1,
                startColumnIndex: 0,
                endColumnIndex: N_COLS,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: COR_FAVIE,
                  textFormat: {
                    bold: true,
                    foregroundColor: COR_TITULO,
                    fontSize: 10,
                    fontFamily: FONTE,
                  },
                },
              },
              fields: "userEnteredFormat(backgroundColor,textFormat)",
            },
          },
          {
            updateBorders: {
              range: {
                sheetId: gid,
                startRowIndex: totalRow0,
                endRowIndex: totalRow0 + 1,
                startColumnIndex: 0,
                endColumnIndex: N_COLS,
              },
              top: { style: "SOLID", color: COR_TITULO },
            },
          },
        ],
      });
    }
  } catch (e) {
    console.error("sincronizarResultadoSheets:", e);
  }
}
