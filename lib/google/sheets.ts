import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { renovarAccessToken, GoogleRevogadoError } from "@/lib/google/oauth";
import { FONTES_CONTATO } from "@/types";
import type { MetricaTrafego } from "@/types";

/**
 * Sincroniza os RESULTADOS da semana (cliente + equipe) numa planilha do Google
 * Sheets, UMA por cliente, criada automaticamente no Drive da conta conectada.
 * Mão única (sistema -> planilha), "melhor esforço": nunca quebra a ação.
 *
 * Organização: UMA ABA POR MÊS (ex.: "Outubro de 2026"), com as semanas
 * daquele mês como linhas. Assim a Fran abre a planilha e vê o mês organizado.
 *
 * Como roda tanto do sistema (equipe logada) quanto do painel (cliente, sem
 * usuário), usa o ADMIN client e a conta Google conectada da agência.
 */

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

/** Métricas de tráfego que viram colunas fixas (mesma ordem do painel). */
const METRICAS = [
  "Investimento",
  "Pessoas alcançadas",
  "Impressões",
  "Visitas à página",
  "Conversas iniciadas",
] as const;

/** Cabeçalho de cada aba de mês (1ª linha). */
function cabecalho(): string[] {
  return [
    "Semana (início)",
    ...METRICAS,
    ...FONTES_CONTATO.map((f) => `Contatos: ${f}`),
    "Total de contatos",
    "Viraram cliente",
    "Comentário do cliente",
    "Nota da equipe",
    "Atualizado em",
  ];
}

const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";

/** Range em notação A1 com a aba entre aspas (nomes com espaço/acento). */
function range(aba: string, a1: string): string {
  return `'${aba.replace(/'/g, "''")}'!${a1}`;
}

/**
 * Mês da semana (a quinta-feira define o mês, igual ao resto do sistema).
 * Devolve a chave "YYYY-MM" e o nome da aba ("Outubro de 2026").
 */
function mesDaSemana(weekStart: string): { aba: string } {
  const [y, m, d] = weekStart.split("-").map(Number);
  const dt = new Date(y, m - 1, d + 3); // quinta define o mês
  const nome = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(dt);
  return { aba: nome.charAt(0).toUpperCase() + nome.slice(1) };
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

/** Escreve valores num range (values.update, USER_ENTERED). */
async function escrever(
  token: string,
  sheetId: string,
  rng: string,
  valores: (string | number)[][],
): Promise<boolean> {
  const url = `${SHEETS}/${sheetId}/values/${encodeURIComponent(rng)}?valueInputOption=USER_ENTERED`;
  const resp = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: valores }),
  });
  return resp.ok;
}

/**
 * Garante a planilha do cliente: devolve o id. Cria (já com a aba do mês atual)
 * se ainda não existir e guarda o id/url no cliente.
 */
async function garantirPlanilha(
  admin: Admin,
  token: string,
  clientId: string,
  abaInicial: string,
): Promise<string | null> {
  const { data: cli } = await admin
    .from("clients")
    .select("name, results_sheet_id")
    .eq("id", clientId)
    .maybeSingle();
  if (!cli) return null;
  if (cli.results_sheet_id) return cli.results_sheet_id;

  // Cria a planilha no Drive da conta conectada, já com a aba do mês.
  const resp = await fetch(SHEETS, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { title: `Resultados — ${cli.name} · favie` },
      sheets: [{ properties: { title: abaInicial } }],
    }),
  });
  if (!resp.ok) return null;
  const j = (await resp.json()) as {
    spreadsheetId?: string;
    spreadsheetUrl?: string;
  };
  const id = j.spreadsheetId;
  if (!id) return null;

  await escrever(token, id, range(abaInicial, "A1"), [cabecalho()]);
  await admin
    .from("clients")
    .update({
      results_sheet_id: id,
      results_sheet_url: j.spreadsheetUrl ?? null,
    })
    .eq("id", clientId);
  return id;
}

/**
 * Garante que a aba do mês existe (cria com cabeçalho se faltar). Devolve false
 * só se não conseguiu nem listar nem criar a aba.
 */
async function garantirAbaMes(
  token: string,
  sheetId: string,
  aba: string,
): Promise<boolean> {
  const r = await fetch(
    `${SHEETS}/${sheetId}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) return false;
  const j = (await r.json()) as {
    sheets?: { properties?: { title?: string } }[];
  };
  const existe = (j.sheets ?? []).some((s) => s.properties?.title === aba);
  if (existe) return true;

  const add = await fetch(`${SHEETS}/${sheetId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title: aba } } }],
    }),
  });
  if (!add.ok) return false;
  await escrever(token, sheetId, range(aba, "A1"), [cabecalho()]);
  return true;
}

/** Monta a linha da semana a partir da linha de resultados. */
function montarLinha(
  weekStart: string,
  res: {
    metrics?: MetricaTrafego[] | null;
    sources_breakdown?: Record<string, number> | null;
    closed_count?: number | null;
    client_comment?: string | null;
    team_note?: string | null;
  } | null,
): (string | number)[] {
  const metricMap = new Map(
    (res?.metrics ?? []).map((m) => [m.label, m.value]),
  );
  const bd = res?.sources_breakdown ?? {};
  const total = Object.values(bd).reduce((a, b) => a + (Number(b) || 0), 0);
  return [
    weekStart,
    ...METRICAS.map((m) => metricMap.get(m) ?? ""),
    ...FONTES_CONTATO.map((f) => Number(bd[f] ?? 0)),
    total,
    res?.closed_count ?? "",
    res?.client_comment ?? "",
    res?.team_note ?? "",
    new Date().toISOString().slice(0, 10),
  ];
}

/**
 * Sincroniza a linha da semana na ABA DO MÊS da planilha do cliente. Faz
 * upsert: acha a semana pela coluna A daquela aba e atualiza; se não existir,
 * acrescenta uma linha.
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

    const { aba } = mesDaSemana(weekStart);
    const sheetId = await garantirPlanilha(admin, token, clientId, aba);
    if (!sheetId) return;
    if (!(await garantirAbaMes(token, sheetId, aba))) return;

    const { data: res } = await admin
      .from("client_monthly_results")
      .select(
        "metrics, sources_breakdown, closed_count, client_comment, team_note",
      )
      .eq("client_id", clientId)
      .eq("week_start", weekStart)
      .maybeSingle();
    const linha = montarLinha(weekStart, res);

    // Procura a semana na coluna A da aba do mês.
    const getUrl = `${SHEETS}/${sheetId}/values/${encodeURIComponent(range(aba, "A2:A1000"))}`;
    const get = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let rowNum: number | null = null;
    if (get.ok) {
      const gj = (await get.json()) as { values?: string[][] };
      const idx = (gj.values ?? []).findIndex((r) => r[0] === weekStart);
      if (idx >= 0) rowNum = idx + 2; // +2: dados começam na linha 2
    }

    if (rowNum) {
      await escrever(token, sheetId, range(aba, `A${rowNum}`), [linha]);
    } else {
      const appendUrl = `${SHEETS}/${sheetId}/values/${encodeURIComponent(range(aba, "A1"))}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
      await fetch(appendUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: [linha] }),
      });
    }
  } catch (e) {
    console.error("sincronizarResultadoSheets:", e);
  }
}
