/**
 * Helpers de OAuth do Google (fluxo "authorization code" com refresh token).
 * Sem SDK — só fetch nos endpoints oficiais. As credenciais vêm de variáveis
 * de ambiente configuradas na Vercel:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 * A redirect URI é derivada da origem da requisição (deve estar registrada
 * no Google Cloud): <origem>/api/google/callback
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

/** Escopos: criar/editar eventos da Agenda e tarefas do Google Tarefas. */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
].join(" ");

export function googleConfigurado(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function redirectUri(origem: string): string {
  return `${origem}/api/google/callback`;
}

/** Monta a URL de consentimento do Google. */
export function urlDeConsentimento(origem: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(origem),
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export interface TokensGoogle {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  id_token?: string;
}

/** Troca o "code" do callback por tokens (inclui refresh_token). */
export async function trocarCodePorTokens(
  code: string,
  origem: string,
): Promise<TokensGoogle> {
  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri(origem),
      grant_type: "authorization_code",
    }),
  });
  if (!resp.ok) {
    throw new Error(`Falha ao obter tokens do Google (${resp.status}).`);
  }
  return (await resp.json()) as TokensGoogle;
}

/** Usa o refresh_token para obter um access_token novo. */
export async function renovarAccessToken(
  refreshToken: string,
): Promise<string> {
  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
    }),
  });
  if (!resp.ok) {
    throw new Error(`Falha ao renovar o acesso ao Google (${resp.status}).`);
  }
  const json = (await resp.json()) as { access_token: string };
  return json.access_token;
}

/** Descobre o e-mail da conta Google a partir do access_token. */
export async function emailDaConta(accessToken: string): Promise<string | null> {
  try {
    const resp = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!resp.ok) return null;
    const json = (await resp.json()) as { email?: string };
    return json.email ?? null;
  } catch {
    return null;
  }
}
