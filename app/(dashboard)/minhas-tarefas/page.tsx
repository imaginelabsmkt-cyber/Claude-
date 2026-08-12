import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TaskCard } from "@/components/tarefas/task-card";
import { getAuthContext } from "@/lib/auth";
import { listContents, listAllClients } from "@/lib/data/contents";
import { listPlannings } from "@/lib/data/plannings";
import {
  classificarGravacao,
  estaGravado,
  ehArte,
  hojeISO,
  papelResponsavel,
  type PapelDemanda,
} from "@/lib/rules/contents";
import { PLANNING_ENTREGUE } from "@/types";
import type { Content, Planning } from "@/types";
import { formatarData } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Grupo {
  titulo: string;
  itens: Content[];
}

const CRIACAO_ARTE = ["Roteiro pronto", "Fila de edição", "Em edição"];
const PRONTOS_POSTAR = ["Aprovado", "Agendado"];

/** Grupos de tarefas do PLANEJAMENTO (Vitória): roteiros e artes. */
function gruposPlanner(contents: Content[]): Grupo[] {
  const meus = contents.filter((c) => papelResponsavel(c) === "planner");
  return [
    {
      titulo: "Planejamentos pendentes",
      itens: meus.filter((c) => c.status === "Planejamento" && !c.script_url),
    },
    {
      titulo: "Roteiros em criação",
      itens: meus.filter((c) => c.status === "Planejamento" && !!c.script_url),
    },
    {
      titulo: "Roteiros a finalizar",
      itens: meus.filter(
        (c) => c.status === "Roteiro pronto" && !ehArte(c.format),
      ),
    },
    {
      titulo: "Artes a criar",
      itens: meus.filter(
        (c) => ehArte(c.format) && CRIACAO_ARTE.includes(c.status),
      ),
    },
    {
      titulo: "Ajustes de arte",
      itens: meus.filter((c) => ehArte(c.format) && c.status === "Ajustes"),
    },
    {
      titulo: "Em revisão interna",
      itens: meus.filter((c) => c.status === "Revisão interna"),
    },
    {
      titulo: "Aprovações de clientes",
      itens: meus.filter((c) => c.status === "Aprovação do cliente"),
    },
    {
      titulo: "Prontos para postar",
      itens: meus.filter((c) => PRONTOS_POSTAR.includes(c.status)),
    },
  ];
}

/** Grupos de tarefas da PRODUÇÃO (Fran): gravações, fotos e edição de vídeo. */
function gruposProducer(contents: Content[], hoje: Date): Grupo[] {
  const meus = contents.filter((c) => papelResponsavel(c) === "producer");
  const paraGravar = meus.filter(
    (c) =>
      c.requires_recording && !estaGravado(c.status) && c.status !== "Cancelado",
  );
  // Exceção: produção de FOTOS de artes é da Fran (mesmo sendo arte da Vitória).
  const fotosArte = contents.filter(
    (c) =>
      ehArte(c.format) &&
      c.requires_recording &&
      !estaGravado(c.status) &&
      c.status !== "Cancelado",
  );
  return [
    { titulo: "Fotos a produzir (artes)", itens: fotosArte },
    {
      titulo: "Gravações da semana",
      itens: paraGravar.filter((c) => classificarGravacao(c, hoje) === "semana"),
    },
    {
      titulo: "Gravações atrasadas",
      itens: paraGravar.filter(
        (c) => classificarGravacao(c, hoje) === "atrasada",
      ),
    },
    {
      titulo: "Próximas gravações",
      itens: paraGravar.filter((c) => classificarGravacao(c, hoje) === "proxima"),
    },
    {
      titulo: "Conteúdos gravados",
      itens: meus.filter((c) => c.status === "Gravado"),
    },
    {
      titulo: "Fila de edição",
      itens: meus.filter((c) => c.status === "Fila de edição"),
    },
    {
      titulo: "Vídeos em edição",
      itens: meus.filter((c) => c.status === "Em edição"),
    },
    {
      titulo: "Ajustes solicitados",
      itens: meus.filter((c) => c.status === "Ajustes"),
    },
    {
      titulo: "Prontos para revisão",
      itens: meus.filter((c) => c.status === "Revisão interna"),
    },
    {
      titulo: "Prontos para postar",
      itens: meus.filter((c) => PRONTOS_POSTAR.includes(c.status)),
    },
  ];
}

export default async function MinhasTarefasPage() {
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const hojeStr = hojeISO(hoje);

  const [ctx, contents, clientes, plannings] = await Promise.all([
    getAuthContext(),
    listContents({}),
    listAllClients(),
    listPlannings(mesAtual),
  ]);

  const clientesById = new Map(clientes.map((c) => [c.id, c]));

  const role = (ctx.profile?.role ?? "admin") as PapelDemanda | "admin";
  const nome = ctx.profile?.name ?? "você";

  // Planejamentos a FAZER (planner): reunião já aconteceu e ainda não entregou.
  const planejamentosAFazer: Planning[] =
    role === "producer"
      ? []
      : plannings.filter(
          (p) =>
            p.meeting_date != null &&
            p.meeting_date <= hojeStr &&
            !PLANNING_ENTREGUE.includes(p.status),
        );
  const mostrarPlanej = planejamentosAFazer.length > 0;

  const blocos: { rotulo: string; grupos: Grupo[] }[] =
    role === "planner"
      ? [{ rotulo: "", grupos: gruposPlanner(contents) }]
      : role === "producer"
        ? [{ rotulo: "", grupos: gruposProducer(contents, hoje) }]
        : [
            { rotulo: "Planejamento e artes", grupos: gruposPlanner(contents) },
            { rotulo: "Produção e edição", grupos: gruposProducer(contents, hoje) },
          ];

  const descricao =
    role === "admin"
      ? "Visão completa (planejamento, artes e produção)"
      : `Tarefas de ${nome}`;

  const totalItens = blocos.reduce(
    (acc, b) => acc + b.grupos.reduce((a, g) => a + g.itens.length, 0),
    0,
  );

  return (
    <>
      <PageHeader titulo="Minhas tarefas" descricao={descricao} />

      {totalItens === 0 && !mostrarPlanej ? (
        <EmptyState
          titulo="Nada pendente por aqui"
          descricao="Quando houver conteúdos nas suas etapas, eles aparecerão aqui."
        />
      ) : (
        <div className="space-y-10">
          {mostrarPlanej ? (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                Planejamentos a fazer
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {planejamentosAFazer.length}
                </span>
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {planejamentosAFazer.map((p) => {
                  const cli = clientesById.get(p.client_id);
                  return (
                    <Link
                      key={p.id}
                      href="/planejamentos"
                      className="block rounded-lg border border-l-4 border-gray-200 bg-white p-3 shadow-sm hover:border-brand-300"
                      style={{ borderLeftColor: cli?.color ?? "#a855f7" }}
                    >
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full border border-gray-200"
                          style={{ backgroundColor: cli?.color ?? "#e5e7eb" }}
                          aria-hidden="true"
                        />
                        {cli?.name ?? "Cliente"}
                      </div>
                      <p className="mt-0.5 text-sm font-semibold text-gray-900">
                        Fazer planejamento
                      </p>
                      <p className="mt-1 text-[11px] text-gray-500">
                        Reunião: {formatarData(p.meeting_date)}
                        {p.delivery_deadline
                          ? ` · Entregar até ${formatarData(p.delivery_deadline)}`
                          : ""}
                      </p>
                      <span className="mt-1 inline-block rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                        {p.status}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}
          {blocos.map((bloco, bi) => (
            <div key={bi} className="space-y-8">
              {bloco.rotulo ? (
                <h2 className="border-b border-gray-200 pb-2 text-base font-bold text-gray-900">
                  {bloco.rotulo}
                </h2>
              ) : null}
              {bloco.grupos.map((g) =>
                g.itens.length === 0 ? null : (
                  <section key={bloco.rotulo + g.titulo}>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                      {g.titulo}
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {g.itens.length}
                      </span>
                    </h3>
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
                  </section>
                ),
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
