import "server-only";
import { normalizarWhatsapp } from "@/lib/utils";

/**
 * =============================================================
 * ENVIO DE WHATSAPP — camada de abstração
 * =============================================================
 * O sistema envia as mensagens pelo SEU próprio número de WhatsApp. Para
 * isso usa uma API que conecta ao seu número (Evolution API, auto-hospedada
 * e gratuita, ou Z-API, paga e simples). Enquanto você não conecta, o
 * provedor "simulacao" deixa tudo funcionando em modo de teste: nada é
 * enviado de verdade, mas o fluxo (status, lembretes) roda normalmente.
 *
 * Provedor escolhido via env WHATSAPP_PROVIDER: "simulacao" (padrão),
 * "evolution" ou "zapi". Este módulo é server-only (nunca vai ao navegador).
 * =============================================================
 */

export type WhatsappProvider = "simulacao" | "evolution" | "zapi";

export interface EnvioWhatsappResultado {
  ok: boolean;
  /** Id da mensagem retornado pelo provedor (quando houver). */
  id?: string;
  /** True quando rodou em modo simulação (nada foi enviado de verdade). */
  simulado?: boolean;
  error?: string;
}

/** Lê o provedor configurado (padrão: simulação). */
export function provedorAtual(): WhatsappProvider {
  const p = (process.env.WHATSAPP_PROVIDER ?? "").trim().toLowerCase();
  if (p === "evolution" || p === "zapi") return p;
  return "simulacao";
}

/**
 * Envia uma mensagem de texto para um número de WhatsApp.
 * `numero` pode vir com máscara — é normalizado para dígitos com DDI 55.
 */
export async function enviarWhatsapp(
  numero: string | null | undefined,
  texto: string,
): Promise<EnvioWhatsappResultado> {
  const destino = normalizarWhatsapp(numero);
  if (!destino) {
    return { ok: false, error: "Número de WhatsApp inválido ou ausente." };
  }
  if (!texto.trim()) {
    return { ok: false, error: "Mensagem vazia." };
  }

  const provider = provedorAtual();
  try {
    switch (provider) {
      case "evolution":
        return await enviarViaEvolution(destino, texto);
      case "zapi":
        return await enviarViaZapi(destino, texto);
      default:
        return enviarSimulado(destino, texto);
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Falha ao enviar WhatsApp.",
    };
  }
}

// -------------------------------------------------------------
// Simulação (modo de teste — padrão)
// -------------------------------------------------------------
function enviarSimulado(
  destino: string,
  texto: string,
): EnvioWhatsappResultado {
  // Log discreto no servidor para acompanhar durante os testes.
  console.info(
    `[whatsapp:simulacao] -> ${destino}\n${texto}\n---------------------`,
  );
  return { ok: true, simulado: true, id: `sim_${Date.now()}` };
}

// -------------------------------------------------------------
// Evolution API (auto-hospedada) — https://doc.evolution-api.com
//   Requer: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE
// -------------------------------------------------------------
async function enviarViaEvolution(
  destino: string,
  texto: string,
): Promise<EnvioWhatsappResultado> {
  const url = requerEnv("EVOLUTION_API_URL").replace(/\/$/, "");
  const apiKey = requerEnv("EVOLUTION_API_KEY");
  const instancia = requerEnv("EVOLUTION_INSTANCE");

  const resp = await fetch(`${url}/message/sendText/${instancia}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({ number: destino, text: texto }),
  });

  if (!resp.ok) {
    const corpo = await resp.text().catch(() => "");
    return {
      ok: false,
      error: `Evolution API respondeu ${resp.status}: ${corpo.slice(0, 200)}`,
    };
  }
  const data = (await resp.json().catch(() => ({}))) as {
    key?: { id?: string };
  };
  return { ok: true, id: data.key?.id };
}

// -------------------------------------------------------------
// Z-API (SaaS) — https://developer.z-api.io
//   Requer: ZAPI_INSTANCE, ZAPI_TOKEN, ZAPI_CLIENT_TOKEN
// -------------------------------------------------------------
async function enviarViaZapi(
  destino: string,
  texto: string,
): Promise<EnvioWhatsappResultado> {
  const instancia = requerEnv("ZAPI_INSTANCE");
  const token = requerEnv("ZAPI_TOKEN");
  const clientToken = requerEnv("ZAPI_CLIENT_TOKEN");

  const url = `https://api.z-api.io/instances/${instancia}/token/${token}/send-text`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": clientToken,
    },
    body: JSON.stringify({ phone: destino, message: texto }),
  });

  if (!resp.ok) {
    const corpo = await resp.text().catch(() => "");
    return {
      ok: false,
      error: `Z-API respondeu ${resp.status}: ${corpo.slice(0, 200)}`,
    };
  }
  const data = (await resp.json().catch(() => ({}))) as {
    messageId?: string;
    id?: string;
  };
  return { ok: true, id: data.messageId ?? data.id };
}

// -------------------------------------------------------------
// Utilitário
// -------------------------------------------------------------
function requerEnv(nome: string): string {
  const v = process.env[nome];
  if (!v || !v.trim()) {
    throw new Error(
      `Variável de ambiente ${nome} não configurada para o WhatsApp.`,
    );
  }
  return v.trim();
}
