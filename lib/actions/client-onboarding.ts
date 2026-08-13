"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";
import { ONBOARDING_SECOES } from "@/lib/onboarding/schema";
import {
  MODELO_IA,
  iaDisponivel,
  criarClienteIA,
  textoDaResposta,
  extrairJSON,
  htmlParaTexto,
} from "@/lib/ai/anthropic";

export interface SalvarResult {
  ok: boolean;
  error?: string;
}

/**
 * Salva (upsert) o DNA/onboarding do cliente. Recebe o mapa completo
 * campo->valor. Só o texto do formulário — nada de arquivos.
 */
export async function salvarOnboardingAction(
  clientId: string,
  data: Record<string, string>,
): Promise<SalvarResult> {
  if (!clientId) return { ok: false, error: "Cliente inválido." };
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }

  // Limpa campos vazios e limita o tamanho de cada resposta.
  const limpo: Record<string, string> = {};
  for (const [k, v] of Object.entries(data ?? {})) {
    const val = (v ?? "").toString().trim();
    if (val) limpo[k] = val.slice(0, 4000);
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("client_onboarding")
    .upsert(
      { client_id: clientId, data: limpo },
      { onConflict: "client_id" },
    );

  if (error) return { ok: false, error: "Não foi possível salvar o onboard." };

  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}

export interface PreencherIAResult {
  ok: boolean;
  error?: string;
  campos?: Record<string, string>;
}

/**
 * Preenche o DNA do cliente com IA, lendo o diagnóstico mais recente dele.
 * Não salva sozinho — devolve os campos para a Fran revisar e salvar.
 */
export async function preencherOnboardComIAAction(
  clientId: string,
): Promise<PreencherIAResult> {
  if (!clientId) return { ok: false, error: "Cliente inválido." };
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  if (!iaDisponivel()) {
    return {
      ok: false,
      error: "IA não configurada. Falta a chave ANTHROPIC_API_KEY no servidor.",
    };
  }

  const supabase = createClient();
  const { data: diag } = await supabase
    .from("client_diagnostics")
    .select("html")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!diag?.html) {
    return {
      ok: false,
      error: "Anexe um diagnóstico deste cliente primeiro (aba Diagnóstico).",
    };
  }

  const texto = htmlParaTexto(diag.html).slice(0, 60000);
  const campos = ONBOARDING_SECOES.flatMap((s) =>
    s.campos.map((c) => ({ id: c.id, rotulo: c.rotulo, secao: s.titulo })),
  );
  const listaCampos = campos
    .map((c) => `- ${c.id} (${c.secao} › ${c.rotulo})`)
    .join("\n");

  const prompt = `Você é analista de uma agência de social media. A seguir está o DIAGNÓSTICO de um cliente. Extraia o DNA do cliente preenchendo os campos abaixo com base APENAS no que o diagnóstico traz.

Campos (id e o que significa):
${listaCampos}

Regras:
- Responda com UM único objeto JSON, chaves = os ids acima, valores = texto em português.
- Seja objetivo e útil (frases curtas, direto ao ponto). Nada de enrolação.
- Se o diagnóstico não trouxer informação para um campo, use "" (string vazia). Não invente.
- Não escreva nada fora do JSON.

DIAGNÓSTICO:
${texto}`;

  try {
    const resposta = await criarClienteIA().messages.create({
      model: MODELO_IA,
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });
    const bruto = extrairJSON<Record<string, unknown>>(
      textoDaResposta(resposta),
    );
    if (!bruto) return { ok: false, error: "A IA não retornou um resultado válido." };

    const idsValidos = new Set(campos.map((c) => c.id));
    const limpo: Record<string, string> = {};
    for (const [k, v] of Object.entries(bruto)) {
      if (!idsValidos.has(k)) continue;
      const val = (v ?? "").toString().trim();
      if (val) limpo[k] = val.slice(0, 4000);
    }
    return { ok: true, campos: limpo };
  } catch {
    return { ok: false, error: "Não foi possível chamar a IA agora. Tente de novo." };
  }
}
