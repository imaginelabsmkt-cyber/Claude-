import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TaskCard } from "@/components/tarefas/task-card";
import { getAuthContext } from "@/lib/auth";
import { listContents, listAllClients } from "@/lib/data/contents";
import {
  classificarGravacao,
  estaGravado,
  mesmaSemana,
  parseData,
} from "@/lib/rules/contents";
import type { Content } from "@/types";

export const dynamic = "force-dynamic";

interface Grupo {
  titulo: string;
  itens: Content[];
}

export default async function MinhasTarefasPage() {
  const [ctx, contents, clientes] = await Promise.all([
    getAuthContext(),
    listContents({}),
    listAllClients(),
  ]);

  const clientesById = new Map(clientes.map((c) => [c.id, c]));
  const hoje = new Date();

  const naoFinal = (c: Content) =>
    c.status !== "Publicado" && c.status !== "Cancelado";
  const naSemana = (c: Content) =>
    c.planned_date != null && mesmaSemana(parseData(c.planned_date)!, hoje);

  // --- Visão de planejamento (Vitória / planner) ---
  const gruposPlanner: Grupo[] = [
    { titulo: "Planejamentos pendentes", itens: contents.filter((c) => c.status === "Planejamento" && !c.script_url) },
    { titulo: "Roteiros em criação", itens: contents.filter((c) => c.status === "Planejamento" && !!c.script_url) },
    { titulo: "Roteiros a finalizar", itens: contents.filter((c) => c.status === "Roteiro pronto") },
    { titulo: "Sem semana definida", itens: contents.filter((c) => c.planned_week == null && naoFinal(c)) },
    { titulo: "Sem data", itens: contents.filter((c) => !c.planned_date && naoFinal(c)) },
    { titulo: "Revisões internas", itens: contents.filter((c) => c.status === "Revisão interna") },
    { titulo: "Aprovações de clientes", itens: contents.filter((c) => c.status === "Aprovação do cliente") },
    { titulo: "Postagens da semana", itens: contents.filter((c) => naSemana(c) && naoFinal(c)) },
  ];

  // --- Visão de produção (Fran / producer) ---
  const paraGravar = contents.filter(
    (c) => c.requires_recording && !estaGravado(c.status) && c.status !== "Cancelado",
  );
  const gruposProducer: Grupo[] = [
    { titulo: "Gravações pendentes", itens: paraGravar.filter((c) => classificarGravacao(c, hoje) === "proxima") },
    { titulo: "Gravações da semana", itens: paraGravar.filter((c) => classificarGravacao(c, hoje) === "semana") },
    { titulo: "Gravações atrasadas", itens: paraGravar.filter((c) => classificarGravacao(c, hoje) === "atrasada") },
    { titulo: "Conteúdos gravados", itens: contents.filter((c) => c.status === "Gravado") },
    { titulo: "Fila de edição", itens: contents.filter((c) => c.status === "Fila de edição") },
    { titulo: "Vídeos em edição", itens: contents.filter((c) => c.status === "Em edição") },
    { titulo: "Ajustes solicitados", itens: contents.filter((c) => c.status === "Ajustes") },
    { titulo: "Prontos para revisão", itens: contents.filter((c) => c.status === "Revisão interna") },
    { titulo: "Postagens da semana", itens: contents.filter((c) => naSemana(c) && naoFinal(c)) },
  ];

  const role = ctx.profile?.role ?? "admin";
  const nome = ctx.profile?.name ?? "você";

  const blocos: { rotulo: string; grupos: Grupo[] }[] =
    role === "planner"
      ? [{ rotulo: "", grupos: gruposPlanner }]
      : role === "producer"
        ? [{ rotulo: "", grupos: gruposProducer }]
        : [
            { rotulo: "Planejamento", grupos: gruposPlanner },
            { rotulo: "Produção", grupos: gruposProducer },
          ];

  const descricao =
    role === "admin"
      ? "Visão completa (planejamento e produção)"
      : `Tarefas de ${nome}`;

  const totalItens = blocos.reduce(
    (acc, b) => acc + b.grupos.reduce((a, g) => a + g.itens.length, 0),
    0,
  );

  return (
    <>
      <PageHeader titulo="Minhas tarefas" descricao={descricao} />

      {totalItens === 0 ? (
        <EmptyState
          titulo="Nada pendente por aqui"
          descricao="Quando houver conteúdos nas suas etapas, eles aparecerão aqui."
        />
      ) : (
        <div className="space-y-10">
          {blocos.map((bloco, bi) => (
            <div key={bi} className="space-y-8">
              {bloco.rotulo ? (
                <h2 className="border-b border-gray-200 pb-2 text-base font-bold text-gray-900">
                  {bloco.rotulo}
                </h2>
              ) : null}
              {bloco.grupos.map((g) => (
                <section key={bloco.rotulo + g.titulo}>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                    {g.titulo}
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {g.itens.length}
                    </span>
                  </h3>
                  {g.itens.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs text-gray-500">
                      Nenhuma tarefa aqui.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {g.itens.map((c) => (
                        <TaskCard
                          key={c.id}
                          content={c}
                          clienteNome={clientesById.get(c.client_id)?.name ?? "—"}
                          cor={clientesById.get(c.client_id)?.color}
                        />
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
