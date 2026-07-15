"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extrairTextoDocx } from "@/lib/import/docx";
import {
  parsePlanejamento,
  type ItemPlanejamento,
} from "@/lib/import/planning-parser";

export interface AnaliseResult {
  ok: boolean;
  error?: string;
  itens?: ItemPlanejamento[];
}

/**
 * Lê o .docx do planejamento e devolve os conteúdos detectados (prévia).
 * NÃO grava nada — só interpreta.
 */
export async function analisarPlanejamentoAction(
  formData: FormData,
): Promise<AnaliseResult> {
  const arquivo = formData.get("arquivo");
  const referenceMonth = String(formData.get("reference_month") ?? "");

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, error: "Selecione o arquivo do planejamento (.docx)." };
  }
  if (!arquivo.name.toLowerCase().endsWith(".docx")) {
    return { ok: false, error: "Envie um arquivo no formato .docx (Word)." };
  }
  if (!/^\d{4}-\d{2}$/.test(referenceMonth)) {
    return { ok: false, error: "Selecione o mês de referência." };
  }

  const ano = Number(referenceMonth.slice(0, 4));

  try {
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    const texto = extrairTextoDocx(bytes);
    const itens = parsePlanejamento(texto, ano);
    if (itens.length === 0) {
      return {
        ok: false,
        error:
          "Nenhum conteúdo reconhecido. Confira se o documento usa os marcadores (CONTEÚDO:, DATA:, SEMANA...).",
      };
    }
    return { ok: true, itens };
  } catch {
    return { ok: false, error: "Não foi possível ler o arquivo .docx." };
  }
}

export interface ImportarResult {
  ok: boolean;
  error?: string;
  quantidade?: number;
}

/**
 * Cria os conteúdos a partir da prévia confirmada pelo usuário.
 * Status inicial "Roteiro pronto" (o roteiro já vem no documento).
 */
export async function importarConteudosAction(input: {
  clientId: string;
  referenceMonth: string;
  itens: ItemPlanejamento[];
}): Promise<ImportarResult> {
  const { clientId, referenceMonth, itens } = input;
  if (!clientId) return { ok: false, error: "Selecione o cliente." };
  if (!Array.isArray(itens) || itens.length === 0) {
    return { ok: false, error: "Nada para importar." };
  }

  const linhas = itens.map((it) => ({
    client_id: clientId,
    title: it.titulo,
    format: it.formato,
    status: "Roteiro pronto" as const,
    priority: "Média" as const,
    reference_month: referenceMonth,
    planned_week: it.semana,
    planned_date: it.dataPrevista,
    actual_post_date: null,
    requires_recording: it.precisaGravacao,
    recording_date: null,
    recording_location: it.local,
    outfit: it.vestimenta,
    participants: it.participantes,
    script: it.roteiro,
    caption: it.legenda,
    description: null,
    content_pillar: null,
    objective: null,
    planner_id: null,
    recorder_id: null,
    editor_id: null,
    publisher_id: null,
    script_deadline: null,
    recording_deadline: null,
    editing_deadline: null,
    reference_url: it.link,
    script_url: null,
    raw_files_url: null,
    edited_file_url: null,
    published_url: null,
    notes: it.observacoes,
  }));

  const supabase = createClient();
  const { error } = await supabase.from("contents").insert(linhas);
  if (error) {
    return { ok: false, error: "Não foi possível criar os conteúdos." };
  }

  revalidatePath("/conteudos");
  revalidatePath(`/clientes/${clientId}`);
  return { ok: true, quantidade: linhas.length };
}
