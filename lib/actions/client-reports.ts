"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";
import {
  MODELO_IA,
  iaDisponivel,
  criarClienteIA,
  textoDaResposta,
  extrairJSON,
} from "@/lib/ai/anthropic";
import type { RelatorioAnalise } from "@/lib/ai/types";

const BUCKET = "client-files";
const LIMITE_BYTES = 12 * 1024 * 1024; // 12 MB (segurança de payload/token)

const IMG_MIME: Record<
  string,
  "image/jpeg" | "image/png" | "image/gif" | "image/webp"
> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/gif": "image/gif",
  "image/webp": "image/webp",
};

export interface AnalisarResult {
  ok: boolean;
  error?: string;
  analise?: RelatorioAnalise;
}

const PROMPT = `Você é analista de social media de uma agência. Analise o RELATÓRIO em anexo (redes sociais do cliente) e devolva um resumo "mastigado" e visual.

Responda com UM único objeto JSON, exatamente com estas chaves:
- "periodo": string com o mês/período do relatório (ou "").
- "resumo": 2 a 3 frases com a visão geral (o que aconteceu no período).
- "indicadores": lista de objetos { "rotulo", "valor", "variacao" } com os PRINCIPAIS números (ex.: seguidores, alcance, engajamento, visualizações). "variacao" só quando o relatório mostrar comparação (ex.: "+12%", "-5%"); senão "".
- "positivos": lista de frases curtas com o que deu certo.
- "negativos": lista de frases curtas com o que não deu / precisa melhorar.
- "recomendacoes": lista de próximos passos práticos.

Regras: português, objetivo, sem enrolação. Use só o que o relatório mostra; não invente números. Não escreva nada fora do JSON.`;

/**
 * Lê o relatório (PDF ou imagem) com IA e salva a análise "mastigada".
 */
export async function analisarRelatorioComIAAction(
  reportId: string,
  clientId: string,
): Promise<AnalisarResult> {
  if (!reportId) return { ok: false, error: "Relatório inválido." };
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
  const { data: rel } = await supabase
    .from("client_reports")
    .select("path, mime_type, file_name")
    .eq("id", reportId)
    .maybeSingle();

  if (!rel?.path) return { ok: false, error: "Arquivo do relatório não encontrado." };

  const { data: blob, error: dlErr } = await supabase.storage
    .from(BUCKET)
    .download(rel.path);
  if (dlErr || !blob) {
    return { ok: false, error: "Não foi possível abrir o arquivo do relatório." };
  }

  const bytes = Buffer.from(await blob.arrayBuffer());
  if (bytes.byteLength > LIMITE_BYTES) {
    return {
      ok: false,
      error: "Relatório muito grande para a IA (máx. ~12 MB). Reduza o arquivo.",
    };
  }
  const b64 = bytes.toString("base64");

  const ext = (rel.file_name ?? "").toLowerCase().split(".").pop() ?? "";
  const mime = (rel.mime_type ?? "").toLowerCase();
  const ehPdf = mime === "application/pdf" || ext === "pdf";
  const imgMime = IMG_MIME[mime] ?? (ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : ["jpg", "jpeg"].includes(ext) ? "image/jpeg" : null);

  let anexo: Anthropic.Messages.ContentBlockParam;
  if (ehPdf) {
    anexo = {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: b64 },
    };
  } else if (imgMime) {
    anexo = {
      type: "image",
      source: { type: "base64", media_type: imgMime, data: b64 },
    };
  } else {
    return {
      ok: false,
      error:
        "Por enquanto a IA lê relatórios em PDF ou imagem. Converta a planilha em PDF e reenvie.",
    };
  }

  try {
    const resposta = await criarClienteIA().messages.create({
      model: MODELO_IA,
      max_tokens: 4000,
      messages: [{ role: "user", content: [anexo, { type: "text", text: PROMPT }] }],
    });
    const analise = extrairJSON<RelatorioAnalise>(textoDaResposta(resposta));
    if (!analise) return { ok: false, error: "A IA não retornou um resultado válido." };

    await supabase
      .from("client_reports")
      .update({ analysis: JSON.stringify(analise) })
      .eq("id", reportId);

    revalidatePath(`/clientes/${clientId}`);
    return { ok: true, analise };
  } catch {
    return { ok: false, error: "Não foi possível chamar a IA agora. Tente de novo." };
  }
}
