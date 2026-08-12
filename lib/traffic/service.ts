import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Client, Database, TrafficCharge, TrafficSettings } from "@/types";
import { SETTINGS_PADRAO } from "@/lib/data/traffic";
import {
  calcularVencimento,
  deveEnviarLembrete,
  segundaDaSemana,
} from "@/lib/rules/traffic";
import { montarMensagem } from "@/lib/traffic/messages";
import { enviarWhatsapp } from "@/lib/whatsapp";

/**
 * =============================================================
 * SERVIÇO DE COBRANÇA DE TRÁFEGO (operações de negócio)
 * =============================================================
 * Concentra as operações que criam/enviam/cobram — reutilizadas tanto pelas
 * Server Actions (com a sessão do usuário) quanto pelas rotas de automação
 * (cron, com o cliente service-role). Por isso todas recebem o cliente
 * Supabase por parâmetro, em vez de criá-lo internamente.
 * =============================================================
 */

type DB = SupabaseClient<Database>;

export interface EnvioResumo {
  enviadas: number;
  falhas: number;
  simuladas: number;
  erros: string[];
}

/** Lê as settings a partir de um cliente Supabase qualquer (ou padrões). */
export async function carregarSettings(db: DB): Promise<TrafficSettings> {
  const { data } = await db
    .from("traffic_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  return data ?? SETTINGS_PADRAO;
}

/**
 * Gera as cobranças da semana para todos os clientes ativos marcados para
 * cobrança de tráfego (que tenham valor definido). Não sobrescreve
 * cobranças já existentes da mesma semana (evita duplicar / apagar pagas).
 * Retorna quantas cobranças novas foram criadas.
 */
export async function gerarCobrancasDaSemana(
  db: DB,
  semanaISO?: string,
): Promise<{ criadas: number; semClientes: boolean }> {
  const semana = semanaISO ?? segundaDaSemana();
  const settings = await carregarSettings(db);

  const { data: clientes } = await db
    .from("clients")
    .select("*")
    .eq("traffic_billing_active", true)
    .eq("active", true);

  const elegiveis = (clientes ?? []).filter(
    (c) => c.traffic_value != null,
  ) as Client[];

  if (elegiveis.length === 0) {
    return { criadas: 0, semClientes: (clientes ?? []).length === 0 };
  }

  const vencimento = calcularVencimento(semana, settings.due_offset_days);
  const linhas = elegiveis.map((c) => ({
    client_id: c.id,
    reference_week: semana,
    amount: Number(c.traffic_value),
    // Pix costuma mudar toda semana: começa vazio e é colado na tela semanal,
    // a não ser que o cliente tenha um Pix fixo cadastrado.
    pix_code: c.traffic_pix_code ?? null,
    due_date: vencimento,
    status: "Pendente" as const,
  }));

  const { data, error } = await db
    .from("traffic_charges")
    .upsert(linhas, {
      onConflict: "client_id,reference_week",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) throw new Error(error.message);
  return { criadas: data?.length ?? 0, semClientes: false };
}

/** Carrega uma cobrança e o cliente correspondente. */
async function carregarCobranca(
  db: DB,
  chargeId: string,
): Promise<{ charge: TrafficCharge | null; client: Client | null }> {
  const { data: charge } = await db
    .from("traffic_charges")
    .select("*")
    .eq("id", chargeId)
    .maybeSingle();
  if (!charge) return { charge: null, client: null };
  const { data: client } = await db
    .from("clients")
    .select("*")
    .eq("id", charge.client_id)
    .maybeSingle();
  return { charge, client: client ?? null };
}

export interface EnvioUnidade {
  ok: boolean;
  error?: string;
  simulado?: boolean;
}

/**
 * Envia (ou reenvia) uma cobrança específica pelo WhatsApp. Valida a
 * presença do Pix e do WhatsApp antes. Atualiza status/erro conforme o
 * resultado.
 */
export async function enviarCobranca(
  db: DB,
  chargeId: string,
  tipo: "cobranca" | "lembrete" = "cobranca",
): Promise<EnvioUnidade> {
  const { charge, client } = await carregarCobranca(db, chargeId);
  if (!charge) return { ok: false, error: "Cobrança não encontrada." };
  if (charge.status === "Pago" || charge.status === "Cancelado") {
    return { ok: false, error: `Cobrança já está ${charge.status}.` };
  }
  if (!charge.pix_code || !charge.pix_code.trim()) {
    return { ok: false, error: "Cole o código Pix antes de enviar." };
  }
  if (!client?.whatsapp) {
    return { ok: false, error: "Cliente sem WhatsApp cadastrado." };
  }

  const settings = await carregarSettings(db);
  const modelo =
    tipo === "lembrete" ? settings.reminder_template : settings.charge_template;
  const texto = montarMensagem(modelo, charge, client);

  const res = await enviarWhatsapp(client.whatsapp, texto);

  if (!res.ok) {
    await db
      .from("traffic_charges")
      .update({ send_error: res.error ?? "Falha ao enviar." })
      .eq("id", chargeId);
    return { ok: false, error: res.error };
  }

  const agora = new Date().toISOString();
  if (tipo === "lembrete") {
    await db
      .from("traffic_charges")
      .update({
        reminder_count: charge.reminder_count + 1,
        last_reminder_at: agora,
        send_error: null,
      })
      .eq("id", chargeId);
  } else {
    await db
      .from("traffic_charges")
      .update({ status: "Enviado", sent_at: agora, send_error: null })
      .eq("id", chargeId);
  }

  return { ok: true, simulado: res.simulado };
}

/**
 * Envia todas as cobranças pendentes de uma semana que já tenham Pix e
 * WhatsApp. Retorna um resumo (enviadas/falhas/simuladas).
 */
export async function enviarPendentes(
  db: DB,
  semanaISO?: string,
): Promise<EnvioResumo> {
  const semana = semanaISO ?? segundaDaSemana();
  const { data: pendentes } = await db
    .from("traffic_charges")
    .select("id")
    .eq("reference_week", semana)
    .eq("status", "Pendente");

  const resumo: EnvioResumo = {
    enviadas: 0,
    falhas: 0,
    simuladas: 0,
    erros: [],
  };

  for (const linha of pendentes ?? []) {
    const res = await enviarCobranca(db, linha.id, "cobranca");
    if (res.ok) {
      resumo.enviadas += 1;
      if (res.simulado) resumo.simuladas += 1;
    } else {
      resumo.falhas += 1;
      if (res.error) resumo.erros.push(res.error);
    }
  }
  return resumo;
}

/**
 * Percorre as cobranças enviadas e dispara lembretes para as que estão
 * atrasadas conforme as settings. Usado pela rotina diária.
 */
export async function processarLembretes(
  db: DB,
  hoje: Date = new Date(),
): Promise<EnvioResumo> {
  const settings = await carregarSettings(db);

  const { data: enviadas } = await db
    .from("traffic_charges")
    .select("*")
    .eq("status", "Enviado");

  const resumo: EnvioResumo = {
    enviadas: 0,
    falhas: 0,
    simuladas: 0,
    erros: [],
  };

  for (const charge of enviadas ?? []) {
    if (!deveEnviarLembrete(charge, settings, hoje)) continue;
    const res = await enviarCobranca(db, charge.id, "lembrete");
    if (res.ok) {
      resumo.enviadas += 1;
      if (res.simulado) resumo.simuladas += 1;
    } else {
      resumo.falhas += 1;
      if (res.error) resumo.erros.push(res.error);
    }
  }
  return resumo;
}
