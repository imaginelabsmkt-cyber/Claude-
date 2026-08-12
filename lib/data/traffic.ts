import { createClient } from "@/lib/supabase/server";
import type {
  Client,
  TrafficCharge,
  TrafficChargeWithClient,
  TrafficSettings,
} from "@/types";
import { estaAtrasada, segundaDaSemana } from "@/lib/rules/traffic";

/**
 * =============================================================
 * CAMADA DE DADOS — COBRANÇA DE TRÁFEGO (leitura)
 * =============================================================
 * Consultas de leitura do módulo. Os relacionamentos são resolvidos em
 * código (o schema tipado usa Relationships: []), no mesmo padrão de
 * lib/data/contents.ts.
 * =============================================================
 */

/** Configuração padrão usada quando a linha de settings ainda não existe. */
export const SETTINGS_PADRAO: TrafficSettings = {
  id: true,
  reminder_days: 2,
  reminder_interval: 2,
  reminder_max: 3,
  due_offset_days: 0,
  charge_template:
    "Olá, {cliente}! Segue a cobrança do tráfego desta semana no valor de {valor}.\n\nPix copia e cola:\n{pix}",
  reminder_template:
    "Oi, {cliente}! Lembrando da cobrança do tráfego ({valor}) que está em aberto.\n\nPix copia e cola:\n{pix}",
  updated_at: new Date(0).toISOString(),
};

/** Lê a configuração única do módulo (ou os padrões, se ainda não existir). */
export async function obterSettings(): Promise<TrafficSettings> {
  const supabase = createClient();
  const { data } = await supabase
    .from("traffic_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  return data ?? SETTINGS_PADRAO;
}

/** Enriquce cobranças com o cliente e o campo derivado `atrasada`. */
function enriquecer(
  charges: TrafficCharge[],
  clientesPorId: Map<string, Client>,
  hoje = new Date(),
): TrafficChargeWithClient[] {
  return charges.map((c) => ({
    ...c,
    client: clientesPorId.get(c.client_id) ?? null,
    atrasada: estaAtrasada(c, hoje),
  }));
}

/** Busca os clientes referenciados por um conjunto de cobranças. */
async function carregarClientes(
  ids: string[],
): Promise<Map<string, Client>> {
  const mapa = new Map<string, Client>();
  if (ids.length === 0) return mapa;
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .in("id", Array.from(new Set(ids)));
  for (const cliente of data ?? []) mapa.set(cliente.id, cliente);
  return mapa;
}

/**
 * Lista as cobranças de uma semana de referência (padrão: a semana atual),
 * já com o cliente resolvido e o status de atraso, ordenadas por nome.
 */
export async function listarCobrancasDaSemana(
  semanaISO?: string,
): Promise<TrafficChargeWithClient[]> {
  const semana = semanaISO ?? segundaDaSemana();
  const supabase = createClient();

  const { data: charges, error } = await supabase
    .from("traffic_charges")
    .select("*")
    .eq("reference_week", semana)
    .order("created_at", { ascending: true });

  if (error || !charges) return [];

  const clientes = await carregarClientes(charges.map((c) => c.client_id));
  const enriquecidas = enriquecer(charges, clientes);
  // Ordena por nome do cliente para a exibição.
  return enriquecidas.sort((a, b) =>
    (a.client?.name ?? "").localeCompare(b.client?.name ?? "", "pt-BR"),
  );
}

/** Lista distintas semanas que já possuem cobranças (mais recentes primeiro). */
export async function listarSemanas(limite = 12): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("traffic_charges")
    .select("reference_week")
    .order("reference_week", { ascending: false });

  const vistas: string[] = [];
  for (const linha of data ?? []) {
    if (!vistas.includes(linha.reference_week)) vistas.push(linha.reference_week);
    if (vistas.length >= limite) break;
  }
  // Garante que a semana atual apareça mesmo sem cobranças ainda.
  const atual = segundaDaSemana();
  if (!vistas.includes(atual)) vistas.unshift(atual);
  return vistas;
}

/** Clientes marcados para cobrança de tráfego (ativos), ordenados por nome. */
export async function listarClientesEmCobranca(): Promise<Client[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("traffic_billing_active", true)
    .eq("active", true)
    .order("name", { ascending: true });
  return data ?? [];
}
