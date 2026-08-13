"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";
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
  // Limite de tamanho: evita travar o servidor com arquivos enormes / zip bomb.
  const LIMITE_BYTES = 8 * 1024 * 1024; // 8 MB
  if (arquivo.size > LIMITE_BYTES) {
    return { ok: false, error: "Arquivo muito grande (máx. 8 MB)." };
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
  criados?: number;
  atualizados?: number;
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
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  if (!Array.isArray(itens) || itens.length === 0) {
    return { ok: false, error: "Nada para importar." };
  }
  if (itens.length > 200) {
    return { ok: false, error: "Muitos itens de uma vez (máx. 200)." };
  }

  const recortar = (v: string | null, max: number) =>
    v == null ? null : v.slice(0, max);

  const montarLinha = (it: ItemPlanejamento) => ({
    client_id: clientId,
    title: (it.titulo ?? "Conteúdo sem título").slice(0, 200),
    format: it.formato,
    status: "Roteiro pronto" as const,
    priority: "Média" as const,
    reference_month: referenceMonth,
    planned_week: it.semana,
    planned_date: it.dataPrevista,
    actual_post_date: null,
    // Gravação é marcada individualmente pela Fran (não vem automática do import).
    requires_recording: false,
    recording_date: null,
    recording_location: recortar(it.local, 300),
    outfit: recortar(it.vestimenta, 300),
    participants: (it.participantes ?? []).slice(0, 20),
    script: recortar(it.roteiro, 20000),
    caption: recortar(it.legenda, 8000),
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
    reference_url: recortar(it.link, 500),
    script_url: null,
    raw_files_url: null,
    edited_file_url: null,
    published_url: null,
    notes: recortar(it.observacoes, 2000),
  });

  const supabase = createClient();

  // Conteúdos que JÁ existem para este cliente/mês (para atualizar em vez de
  // duplicar). Assim reimportar corrige o roteiro dos que já estão no sistema.
  const { data: existentes } = await supabase
    .from("contents")
    .select("id, title")
    .eq("client_id", clientId)
    .eq("reference_month", referenceMonth);
  const norm = (t: string) => t.trim().toLowerCase();
  const porTitulo = new Map(
    (existentes ?? []).map((c) => [norm(c.title), c.id]),
  );

  const paraInserir: ReturnType<typeof montarLinha>[] = [];
  let atualizados = 0;
  for (const it of itens) {
    const linha = montarLinha(it);
    const id = porTitulo.get(norm(linha.title));
    if (id) {
      // Atualiza SÓ o que vem do documento (roteiro, legenda, referência),
      // preservando o que a Fran já mexeu (status, datas, gravação, etc.).
      const { error } = await supabase
        .from("contents")
        .update({
          script: linha.script,
          caption: linha.caption,
          reference_url: linha.reference_url,
        })
        .eq("id", id);
      if (!error) atualizados += 1;
    } else {
      paraInserir.push(linha);
    }
  }

  if (paraInserir.length > 0) {
    const { error } = await supabase.from("contents").insert(paraInserir);
    if (error) {
      return { ok: false, error: "Não foi possível criar os conteúdos." };
    }
  }

  revalidatePath("/conteudos");
  revalidatePath(`/clientes/${clientId}`);
  return {
    ok: true,
    quantidade: itens.length,
    criados: paraInserir.length,
    atualizados,
  };
}
