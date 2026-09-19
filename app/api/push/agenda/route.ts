import { executarLembretes } from "@/lib/push/lembretes-core";

// Cron da MANHÃ: o que é de hoje (vence hoje, gravações de hoje).
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return executarLembretes(req, "agenda");
}
export async function POST(req: Request) {
  return executarLembretes(req, "agenda");
}
