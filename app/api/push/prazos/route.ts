import { executarLembretes } from "@/lib/push/lembretes-core";

// Cron da TARDE: pendências (atrasados, perto de vencer) + sexta os relatórios.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return executarLembretes(req, "prazos");
}
export async function POST(req: Request) {
  return executarLembretes(req, "prazos");
}
