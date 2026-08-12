"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  enviarCobranca,
  enviarPendentes,
  gerarCobrancasDaSemana,
  type EnvioResumo,
} from "@/lib/traffic/service";
import {
  trafficSettingsSchema,
  type TrafficSettingsFormValues,
} from "@/lib/validation/traffic";

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const ROTA = "/trafego";

/** Gera as cobranças da semana (idempotente — não duplica). */
export async function gerarCobrancasAction(
  semanaISO?: string,
): Promise<ActionResult & { criadas?: number }> {
  const supabase = createClient();
  try {
    const { criadas, semClientes } = await gerarCobrancasDaSemana(
      supabase,
      semanaISO,
    );
    revalidatePath(ROTA);
    if (semClientes) {
      return {
        ok: true,
        criadas: 0,
        error:
          "Nenhum cliente marcado para cobrança de tráfego. Ative a cobrança e defina o valor no cadastro do cliente.",
      };
    }
    return { ok: true, criadas };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Não foi possível gerar.",
    };
  }
}

/** Salva/atualiza o código Pix de uma cobrança específica. */
export async function salvarPixAction(
  chargeId: string,
  pix: string,
): Promise<ActionResult> {
  const supabase = createClient();
  const valor = pix.trim();
  const { error } = await supabase
    .from("traffic_charges")
    .update({ pix_code: valor || null })
    .eq("id", chargeId);
  if (error) return { ok: false, error: "Não foi possível salvar o Pix." };
  revalidatePath(ROTA);
  return { ok: true };
}

/** Envia (ou reenvia) uma cobrança pelo WhatsApp. */
export async function enviarCobrancaAction(
  chargeId: string,
): Promise<ActionResult & { simulado?: boolean }> {
  const supabase = createClient();
  const res = await enviarCobranca(supabase, chargeId, "cobranca");
  revalidatePath(ROTA);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, simulado: res.simulado };
}

/** Envia todas as cobranças pendentes da semana de uma vez. */
export async function enviarPendentesAction(
  semanaISO?: string,
): Promise<ActionResult & { resumo?: EnvioResumo }> {
  const supabase = createClient();
  try {
    const resumo = await enviarPendentes(supabase, semanaISO);
    revalidatePath(ROTA);
    return { ok: true, resumo };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Falha ao enviar.",
    };
  }
}

/** Marca uma cobrança como paga (registro manual). */
export async function marcarPagaAction(
  chargeId: string,
  paga: boolean,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("traffic_charges")
    .update(
      paga
        ? { status: "Pago", paid_at: new Date().toISOString() }
        : { status: "Enviado", paid_at: null },
    )
    .eq("id", chargeId);
  if (error) return { ok: false, error: "Não foi possível atualizar." };
  revalidatePath(ROTA);
  return { ok: true };
}

/** Cancela uma cobrança. */
export async function cancelarCobrancaAction(
  chargeId: string,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("traffic_charges")
    .update({ status: "Cancelado" })
    .eq("id", chargeId);
  if (error) return { ok: false, error: "Não foi possível cancelar." };
  revalidatePath(ROTA);
  return { ok: true };
}

/** Salva a configuração do módulo (lembretes + modelos de mensagem). */
export async function salvarSettingsAction(
  input: TrafficSettingsFormValues,
): Promise<ActionResult> {
  const parsed = trafficSettingsSchema.safeParse(input);
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    const saida: Record<string, string> = {};
    for (const [campo, msgs] of Object.entries(fe)) {
      if (msgs && msgs.length) saida[campo] = msgs[0];
    }
    return { ok: false, error: "Verifique os campos.", fieldErrors: saida };
  }

  const supabase = createClient();
  const { error } = await supabase.from("traffic_settings").upsert({
    id: true,
    reminder_days: Number(parsed.data.reminder_days),
    reminder_interval: Number(parsed.data.reminder_interval),
    reminder_max: Number(parsed.data.reminder_max),
    due_offset_days: Number(parsed.data.due_offset_days),
    charge_template: parsed.data.charge_template.trim(),
    reminder_template: parsed.data.reminder_template.trim(),
  });

  if (error) return { ok: false, error: "Não foi possível salvar." };
  revalidatePath(ROTA);
  revalidatePath(`${ROTA}/configuracoes`);
  return { ok: true };
}
