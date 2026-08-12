/**
 * Calendários próprios da agência dentro da conta Google do usuário.
 * Cada tipo de demanda vai para o seu calendário:
 *  - reunioes  => "Imagine Reuniões"
 *  - producao  => "Imagine Produção" (gravações e fotos)
 *  - postagens => "Imagine Postagens"
 * O ID de cada calendário é criado sob demanda e guardado em google_accounts
 * (cal_reunioes / cal_producao / cal_postagens) para não recriar toda vez.
 */
import { createClient } from "@/lib/supabase/server";

type SB = ReturnType<typeof createClient>;
export type CalendarioKind = "reunioes" | "producao" | "postagens";

const TZ = "America/Boa_Vista";

const NOME: Record<CalendarioKind, string> = {
  reunioes: "Imagine Reuniões",
  producao: "Imagine Produção",
  postagens: "Imagine Postagens",
};

const COLUNA: Record<CalendarioKind, "cal_reunioes" | "cal_producao" | "cal_postagens"> =
  {
    reunioes: "cal_reunioes",
    producao: "cal_producao",
    postagens: "cal_postagens",
  };

/**
 * Devolve o calendarId do calendário da agência para aquele tipo. Usa o cache
 * em google_accounts; se não houver, procura pelo nome (ou cria) e guarda.
 * Em caso de falha, cai para "primary" (não quebra a sincronização).
 */
export async function calendarioId(
  sb: SB,
  userId: string,
  token: string,
  kind: CalendarioKind,
): Promise<string> {
  const coluna = COLUNA[kind];
  const { data } = await sb
    .from("google_accounts")
    .select(coluna)
    .eq("user_id", userId)
    .maybeSingle();
  const cached = (data as Record<string, string | null> | null)?.[coluna];
  if (cached) return cached;

  const nome = NOME[kind];
  let id: string | null = null;

  // Procura um calendário já existente com esse nome.
  try {
    const resp = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250",
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (resp.ok) {
      const json = (await resp.json()) as {
        items?: { id: string; summary?: string }[];
      };
      id = json.items?.find((c) => c.summary === nome)?.id ?? null;
    }
  } catch {
    /* segue para criar */
  }

  // Não existe: cria.
  if (!id) {
    try {
      const cr = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ summary: nome, timeZone: TZ }),
      });
      if (cr.ok) {
        const j = (await cr.json()) as { id?: string };
        id = j.id ?? null;
      }
    } catch {
      /* sem sorte */
    }
  }

  if (!id) return "primary"; // fallback seguro

  await sb
    .from("google_accounts")
    .update({ [coluna]: id })
    .eq("user_id", userId);
  return id;
}
