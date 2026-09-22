/**
 * Geração automática da CAPA quando um vídeo é editado.
 * Regra do time:
 * - Vitória (planner): a capa/arte/layout/design em si (é uma arte).
 * - Fran (producer): a FOTO da capa, quando a capa tiver foto (marca-se
 *   "precisa de fotos" na arte da capa => vira demanda de foto da Fran).
 *
 * A capa é um conteúdo de formato "Post estático" (aparece no quadro de Artes),
 * vinculado ao vídeo por cover_source_id, o que evita duplicar a capa.
 */
import { createClient } from "@/lib/supabase/server";
import { ehArte } from "@/lib/rules/contents";

type SB = ReturnType<typeof createClient>;

/**
 * Cria a demanda de capa do vídeo (se ainda não existir). Só age para VÍDEOS
 * (não para artes). Melhor esforço: nunca quebra a ação principal.
 */
export async function criarCapaDoVideo(
  sb: SB,
  videoId: string,
): Promise<void> {
  try {
    const { data: v } = await sb
      .from("contents")
      .select("title, format, client_id, reference_month, planned_date")
      .eq("id", videoId)
      .maybeSingle();
    if (!v) return;
    // Só gera capa para vídeos (uma arte não gera capa de si mesma).
    if (ehArte(v.format)) return;

    // Já existe capa para este vídeo? não duplica.
    const { data: existente } = await sb
      .from("contents")
      .select("id")
      .eq("cover_source_id", videoId)
      .maybeSingle();
    if (existente) return;

    await sb.from("contents").insert({
      client_id: v.client_id,
      title: `Capa: ${v.title}`.slice(0, 200),
      format: "Post estático",
      status: "Em edição", // arte em criação (aparece como "Em criação")
      priority: "Média",
      reference_month: v.reference_month,
      planned_week: null,
      planned_date: v.planned_date,
      actual_post_date: null,
      requires_recording: false, // marca-se depois se a capa tiver foto (Fran)
      recording_date: null,
      recording_location: null,
      outfit: null,
      participants: [],
      script: null,
      caption: null,
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
      reference_url: null,
      script_url: null,
      raw_files_url: null,
      edited_file_url: null,
      published_url: null,
      notes: "Foto: Fran (se a capa tiver foto). Capa/design: Vitória.",
      cover_source_id: videoId,
    });
  } catch (e) {
    console.error("criarCapaDoVideo:", e);
  }
}

/**
 * Quando o vídeo é publicado, a capa dele já está pronta: marca a capa como
 * "Publicado" também (com a mesma data real), a menos que já esteja publicada
 * ou cancelada. Melhor esforço: nunca quebra a ação principal.
 */
export async function publicarCapaDoVideo(
  sb: SB,
  videoId: string,
  dataReal: string | null,
): Promise<void> {
  try {
    const { data: capa } = await sb
      .from("contents")
      .select("id, status")
      .eq("cover_source_id", videoId)
      .maybeSingle();
    if (!capa) return;
    if (capa.status === "Publicado" || capa.status === "Cancelado") return;

    const dados: {
      status: "Publicado";
      actual_post_date?: string | null;
      reference_month?: string | null;
    } = { status: "Publicado" };
    if (dataReal) {
      dados.actual_post_date = dataReal;
      dados.reference_month = dataReal.slice(0, 7);
    }
    await sb.from("contents").update(dados).eq("id", capa.id);
  } catch (e) {
    console.error("publicarCapaDoVideo:", e);
  }
}
