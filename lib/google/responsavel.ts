/**
 * Responsável pela demanda (para aparecer no título da tarefa/evento do Google).
 *
 * Regras fixas do time:
 * - Vitória (planner): planejamento e criação de arte/design (Carrossel, Post estático).
 * - Fran (producer): edição de vídeo e produções/gravações.
 *
 * O nome é lido da tabela profiles pelo papel, então não fica "chumbado" no
 * código: se as pessoas mudarem, o rótulo acompanha.
 */
import { createClient } from "@/lib/supabase/server";
import { ehArte } from "@/lib/rules/contents";

type SB = ReturnType<typeof createClient>;
export type Papel = "planner" | "producer";

export { ehArte };

/**
 * Rótulo " (Nome)" da pessoa responsável por aquele papel, para pôr no título
 * do Google. Usa só o primeiro nome (título curto). Vazio se não houver perfil.
 */
export async function rotuloResponsavel(sb: SB, papel: Papel): Promise<string> {
  const { data } = await sb
    .from("profiles")
    .select("name")
    .eq("role", papel)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const nome = data?.name?.trim().split(/\s+/)[0];
  return nome ? ` (${nome})` : "";
}

/**
 * E-mail da pessoa responsável por aquele papel (para adicionar como
 * participante do evento no Google). Null se não houver perfil/e-mail.
 */
export async function emailPorPapel(
  sb: SB,
  papel: Papel,
): Promise<string | null> {
  const { data } = await sb
    .from("profiles")
    .select("email")
    .eq("role", papel)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const email = data?.email?.trim();
  return email ? email : null;
}
