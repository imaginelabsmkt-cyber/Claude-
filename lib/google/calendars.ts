/**
 * Calendários próprios da agência dentro da conta Google do usuário.
 * Cada tipo de demanda vai para o seu calendário:
 *  - reunioes  => "Reuniões"
 *  - producao  => "Produção Vídeo/foto" (gravações e fotos)
 *  - postagens => "Postagens"
 * O ID de cada calendário é resolvido SEMPRE pelo nome (fonte da verdade):
 * assim, se a pessoa renomear a agenda no Google, o sistema continua usando a
 * MESMA agenda — e nunca cria duplicata. O ID resolvido fica em cache
 * (google_accounts.cal_*) só como reserva para quando o Google estiver fora.
 */
import { createClient } from "@/lib/supabase/server";

type SB = ReturnType<typeof createClient>;
export type CalendarioKind = "reunioes" | "producao" | "postagens";

const TZ = "America/Boa_Vista";

const NOME: Record<CalendarioKind, string> = {
  reunioes: "Reuniões",
  producao: "Produção Vídeo/foto",
  postagens: "Postagens",
};

/** Normaliza nome de agenda para comparar (ignora espaços nas pontas e caixa). */
function normalizarNome(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

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
  const alvo = normalizarNome(NOME[kind]);

  // 1) Fonte da verdade: procura pelo NOME na lista de agendas do usuário.
  //    Compara ignorando espaços/caixa, então "Reuniões", " Reuniões" e
  //    "reuniões" são a mesma. Se a pessoa renomeou a agenda, achamos aqui.
  let encontrada: string | null = null;
  let listaOk = false;
  try {
    const resp = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250",
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (resp.ok) {
      listaOk = true;
      const json = (await resp.json()) as {
        items?: { id: string; summary?: string }[];
      };
      encontrada =
        json.items?.find((c) => normalizarNome(c.summary) === alvo)?.id ?? null;
    }
  } catch {
    /* segue para o cache */
  }

  if (encontrada) {
    // Achou: garante que o cache aponte para ela (auto-corrige vínculos
    // antigos que apontavam para uma agenda duplicada).
    const { data } = await sb
      .from("google_accounts")
      .select(coluna)
      .eq("user_id", userId)
      .maybeSingle();
    const cached = (data as Record<string, string | null> | null)?.[coluna];
    if (cached !== encontrada) {
      await sb
        .from("google_accounts")
        .update({ [coluna]: encontrada })
        .eq("user_id", userId);
    }
    return encontrada;
  }

  // 2) Não achou pelo nome — usa o cache como reserva (ex.: Google fora do ar).
  const { data } = await sb
    .from("google_accounts")
    .select(coluna)
    .eq("user_id", userId)
    .maybeSingle();
  const cached = (data as Record<string, string | null> | null)?.[coluna];
  if (cached) return cached;

  // 3) Só cria uma agenda nova se a lista veio OK e realmente não existe
  //    nenhuma com esse nome (evita criar duplicata por falha de rede).
  if (!listaOk) return "primary";

  let id: string | null = null;
  try {
    const cr = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ summary: NOME[kind], timeZone: TZ }),
    });
    if (cr.ok) {
      const j = (await cr.json()) as { id?: string };
      id = j.id ?? null;
    }
  } catch {
    /* sem sorte */
  }

  if (!id) return "primary"; // fallback seguro

  await sb
    .from("google_accounts")
    .update({ [coluna]: id })
    .eq("user_id", userId);
  return id;
}
