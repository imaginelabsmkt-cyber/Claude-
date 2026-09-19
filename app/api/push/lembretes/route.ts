import { executarLembretes } from "@/lib/push/lembretes-core";

// Roda no servidor (precisa das chaves e do service role).
export const dynamic = "force-dynamic";

// Endpoint genérico (para teste manual): ?bloco=agenda|prazos|todos.
export async function GET(req: Request) {
  return executarLembretes(req);
}
export async function POST(req: Request) {
  return executarLembretes(req);
}
