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

/** Cabeçalho da planilha (1ª linha). */
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
const ABA = "Resultados";

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

/** Escreve valores num range (values.update, RAW/USER_ENTERED). */
async function escrever(
  token: string,
  sheetId: string,
  range: string,
  valores: (string | number)[][],
): Promise<boolean> {
  const url = `${SHEETS}/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
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
 * Garante a planilha do cliente: devolve o id. Cria (com cabeçalho) se ainda
 * não existir e guarda o id/url no cliente.
 */
async function garantirPlanilha(
  admin: Admin,
  token: string,
  clientId: string,
): Promise<string | null> {
  const { data: cli } = await admin
    .from("clients")
    .select("name, results_sheet_id")
    .eq("id", clientId)
    .maybeSingle();
  if (!cli) return null;
  if (cli.results_sheet_id) return cli.results_sheet_id;

  // Cria a planilha no Drive da conta conectada.
  const resp = await fetch(SHEETS, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { title: `Resultados — ${cli.name} · favie` },
      sheets: [{ properties: { title: ABA } }],
    }),
  });
  if (!resp.ok) return null;
  const j = (await resp.json()) as {
    spreadsheetId?: string;
    spreadsheetUrl?: string;
  };
  const id = j.spreadsheetId;
  if (!id) return null;

  await escrever(token, id, `${ABA}!A1`, [cabecalho()]);
  await admin
    .from("clients")
    .update({
      results_sheet_id: id,
      results_sheet_url: j.spreadsheetUrl ?? null,
    })
    .eq("id", clientId);
  return id;
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
  const total = Object.values(bd).reduce(
    (a, b) => a + (Number(b) || 0),
    0,
  );
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
 * Sincroniza a linha da semana na planilha do cliente. Faz upsert: acha a
 * semana pela coluna A e atualiza; se não existir, acrescenta uma linha.
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

    const sheetId = await garantirPlanilha(admin, token, clientId);
    if (!sheetId) return;

    const { data: res } = await admin
      .from("client_monthly_results")
      .select("metrics, sources_breakdown, closed_count, client_comment, team_note")
      .eq("client_id", clientId)
      .eq("week_start", weekStart)
      .maybeSingle();
    const linha = montarLinha(weekStart, res);

    // Procura a semana na coluna A.
    const getUrl = `${SHEETS}/${sheetId}/values/${encodeURIComponent(`${ABA}!A2:A100000`)}`;
    const get = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let rowNum: number | null = null;
    if (get.ok) {
      const gj = (await get.json()) as { values?: string[][] };
      const idx = (gj.values ?? []).findIndex((r) => r[0] === weekStart);
      if (idx >= 0) rowNum = idx + 2; // +2: começa na linha 2
    }

    if (rowNum) {
      await escrever(token, sheetId, `${ABA}!A${rowNum}`, [linha]);
    } else {
      const appendUrl = `${SHEETS}/${sheetId}/values/${encodeURIComponent(`${ABA}!A1`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
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
