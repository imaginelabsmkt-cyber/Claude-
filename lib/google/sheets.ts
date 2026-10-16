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
const COR_TITULO = rgb(123, 35, 64); // marsala
const COR_FAVIE = rgb(243, 226, 232); // rosado claro
const COR_CLIENTE = rgb(247, 233, 204); // dourado claro
const COR_HEADER = rgb(239, 230, 218); // bege
const COR_BANDA = rgb(250, 245, 238); // alternada
const BRANCO = rgb(255, 255, 255);
const TINTA = rgb(58, 16, 32);

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
  linhaTitulo[0] = `Resultados de ${clienteNome} · ${aba}`;

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

/** Requests de formatação da aba recém-criada (uma faixa, duas seções…). */
function requestsFormato(gid: number) {
  const gridHeader = (sr: number, er: number, sc: number, ec: number) => ({
    sheetId: gid,
    startRowIndex: sr,
    endRowIndex: er,
    startColumnIndex: sc,
    endColumnIndex: ec,
  });
  const cell = (
    bg: { red: number; green: number; blue: number },
    opts: { bold?: boolean; size?: number; fg?: typeof BRANCO; center?: boolean; wrap?: boolean } = {},
  ) => ({
    userEnteredFormat: {
      backgroundColor: bg,
      horizontalAlignment: opts.center ? "CENTER" : "LEFT",
      verticalAlignment: "MIDDLE",
      wrapStrategy: opts.wrap ? "WRAP" : "OVERFLOW_CELL",
      textFormat: {
        bold: !!opts.bold,
        fontSize: opts.size ?? 10,
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
  const largura = (sc: number, ec: number, px: number) => ({
    updateDimensionProperties: {
      range: { sheetId: gid, dimension: "COLUMNS", startIndex: sc, endIndex: ec },
      properties: { pixelSize: px },
      fields: "pixelSize",
    },
  });

  return [
    // Congela as 3 linhas de cabeçalho e a 1ª coluna.
    {
      updateSheetProperties: {
        properties: { sheetId: gid, gridProperties: { frozenRowCount: 3, frozenColumnCount: 1 } },
        fields: "gridProperties(frozenRowCount,frozenColumnCount)",
      },
    },
    // Merges: título, Semana (vertical), faixas das seções, Atualizado (vertical).
    { mergeCells: { range: gridHeader(0, 1, 0, N_COLS), mergeType: "MERGE_ALL" } },
    { mergeCells: { range: gridHeader(1, 3, IDX_SEMANA, IDX_SEMANA + 1), mergeType: "MERGE_ALL" } },
    { mergeCells: { range: gridHeader(1, 2, IDX_FAVIE_INI, IDX_FAVIE_FIM), mergeType: "MERGE_ALL" } },
    { mergeCells: { range: gridHeader(1, 2, IDX_CLI_INI, IDX_CLI_FIM), mergeType: "MERGE_ALL" } },
    { mergeCells: { range: gridHeader(1, 3, IDX_ATUAL, IDX_ATUAL + 1), mergeType: "MERGE_ALL" } },
    // Estilos das linhas de cabeçalho.
    repeat(gridHeader(0, 1, 0, N_COLS), cell(COR_TITULO, { bold: true, size: 13, fg: BRANCO, center: true })),
    repeat(gridHeader(1, 3, IDX_SEMANA, IDX_SEMANA + 1), cell(COR_HEADER, { bold: true, center: true, wrap: true })),
    repeat(gridHeader(1, 2, IDX_FAVIE_INI, IDX_FAVIE_FIM), cell(COR_FAVIE, { bold: true, center: true })),
    repeat(gridHeader(2, 3, IDX_FAVIE_INI, IDX_FAVIE_FIM), cell(COR_FAVIE, { bold: true, center: true, wrap: true })),
    repeat(gridHeader(1, 2, IDX_CLI_INI, IDX_CLI_FIM), cell(COR_CLIENTE, { bold: true, center: true })),
    repeat(gridHeader(2, 3, IDX_CLI_INI, IDX_CLI_FIM), cell(COR_CLIENTE, { bold: true, center: true, wrap: true })),
    repeat(gridHeader(1, 3, IDX_ATUAL, IDX_ATUAL + 1), cell(COR_HEADER, { bold: true, center: true, wrap: true })),
    // Formatos de número: moeda no Investimento, número nos demais.
    numFmt(IDX_FAVIE_INI, IDX_FAVIE_INI + 1, '"R$" #,##0.00'),
    numFmt(IDX_FAVIE_INI + 1, IDX_FAVIE_INI + 5, "#,##0"),
    numFmt(IDX_CLI_INI, IDX_CLI_INI + N_FONTES + 3, "#,##0"),
    // Larguras.
    largura(IDX_SEMANA, IDX_SEMANA + 1, 110),
    largura(IDX_FAVIE_INI, IDX_FAVIE_INI + 5, 115),
    largura(IDX_FAVIE_INI + 5, IDX_FAVIE_INI + 6, 210),
    largura(IDX_CLI_INI, IDX_CLI_FIM - 1, 120),
    largura(IDX_CLI_FIM - 1, IDX_CLI_FIM, 240),
    largura(IDX_ATUAL, IDX_ATUAL + 1, 110),
  ];
}

/**
 * Garante que a aba do mês existe e está formatada. Devolve o gid (numérico) ou
 * null. Cria com cabeçalho + formatação e remove a aba padrão vazia.
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
  if (existente?.properties?.sheetId != null) return existente.properties.sheetId;

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

  // Cabeçalho (3 linhas) e formatação.
  await escrever(token, sheetId, range(aba, "A1"), cabecalho(clienteNome, aba));

  const requests: unknown[] = requestsFormato(gid);
  // Remove a aba padrão vazia ("Página1"/"Sheet1") deixada na criação.
  const padrao = abas.find(
    (s) => s.properties?.title && /^(sheet1|página1|planilha1|page1)$/i.test(s.properties.title),
  );
  if (padrao?.properties?.sheetId != null) {
    requests.push({ deleteSheet: { sheetId: padrao.properties.sheetId } });
  }
  await gapi(token, `${SHEETS}/${sheetId}:batchUpdate`, "POST", { requests });

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

    const { data: res } = await admin
      .from("client_monthly_results")
      .select(
        "metrics, sources_breakdown, closed_traffic, closed_organic, client_comment, team_note",
      )
      .eq("client_id", clientId)
      .eq("week_start", weekStart)
      .maybeSingle();
    const linha = montarLinha(weekStart, res);

    // Procura a semana na coluna A (dados a partir da linha 4).
    const getUrl = `${SHEETS}/${planilha.id}/values/${encodeURIComponent(range(aba, `A${LINHA_DADOS}:A1000`))}`;
    const get = await gapi(token, getUrl, "GET");
    let rowNum: number | null = null;
    if (get.ok) {
      const gj = (await get.json()) as { values?: string[][] };
      const idx = (gj.values ?? []).findIndex((r) => r[0] === weekStart);
      if (idx >= 0) rowNum = idx + LINHA_DADOS;
    }

    if (rowNum) {
      await escrever(token, planilha.id, range(aba, `A${rowNum}`), [linha]);
    } else {
      const appendUrl = `${SHEETS}/${planilha.id}/values/${encodeURIComponent(range(aba, `A${LINHA_DADOS}`))}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
      await gapi(token, appendUrl, "POST", { values: [linha] });
    }
  } catch (e) {
    console.error("sincronizarResultadoSheets:", e);
  }
}
