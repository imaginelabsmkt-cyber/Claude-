import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { AgoraPanel } from "@/components/dashboard/agora-panel";
import { BarChart } from "@/components/dashboard/bar-chart";
import { StatusContentBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatarData } from "@/lib/utils";
import {
  listContents,
  listAllClients,
  listProfiles,
} from "@/lib/data/contents";
import { listPlannings } from "@/lib/data/plannings";
import {
  estaAtrasado,
  estaGravado,
  ehArte,
  ehCapa,
  hojeISO,
  mesmaSemana,
  parseData,
  GRUPO_EM_APROVACAO,
  GRUPO_PRONTOS_PUBLICAR,
} from "@/lib/rules/contents";
import { STATUS_OPTIONS, PLANNING_ENTREGUE, type Content } from "@/types";

export const dynamic = "force-dynamic";

const linkStatus = (s: string) => `/conteudos?status=${encodeURIComponent(s)}`;

export default async function DashboardPage() {
  const hoje = new Date();
  const hojeStr = hojeISO(hoje);
  const mesAtual = hojeStr.slice(0, 7);

  const [contents, clientes, plannings, perfis] = await Promise.all([
    listContents({}),
    listAllClients(),
    listPlannings(mesAtual),
    listProfiles(),
  ]);
  const clientesById = new Map(clientes.map((c) => [c.id, c]));

  // Planejamentos a fazer: reunião já aconteceu e ainda não foi entregue.
  const planejAFazer = plannings.filter(
    (p) =>
      p.meeting_date != null &&
      p.meeting_date <= hojeStr &&
      !PLANNING_ENTREGUE.includes(p.status),
  ).length;

  const naoFinal = (c: Content) =>
    c.status !== "Publicado" && c.status !== "Cancelado";
  const conta = (s: Content["status"]) =>
    contents.filter((c) => c.status === s).length;

  // Postagens desta semana (por data prevista)
  const postSemana = contents.filter(
    (c) => c.planned_date && mesmaSemana(parseData(c.planned_date)!, hoje),
  ).length;

  const atrasados = contents.filter((c) => estaAtrasado(c, hoje));
  const publicadosMes = contents.filter(
    (c) =>
      c.status === "Publicado" &&
      !ehCapa(c) && // capa não é conteúdo publicado
      (c.actual_post_date ?? c.planned_date ?? "").slice(0, 7) === mesAtual,
  ).length;

  // PRODUÇÃO DO MÊS — vídeo (não-arte) já gravado. Usa a data de gravação; se
  // ela estiver vazia (ex.: status mudado pela setinha), cai no mês de
  // planejamento do vídeo, para não perder produção da contagem.
  const gravadoNoMes = (c: Content) =>
    !ehArte(c.format) &&
    estaGravado(c.status) &&
    (c.recording_date
      ? c.recording_date.slice(0, 7) === mesAtual
      : (c.reference_month ?? "") === mesAtual);
  const gravadosMes = contents.filter(gravadoNoMes).length;
  const prontosPublicar = contents.filter((c) =>
    GRUPO_PRONTOS_PUBLICAR.includes(c.status),
  ).length;
  const emAprovacao = contents.filter((c) =>
    GRUPO_EM_APROVACAO.includes(c.status),
  ).length;

  const cards = [
    { rotulo: "Planejamentos a fazer", valor: planejAFazer, href: "/planejamentos", destaque: planejAFazer > 0, icone: "clipboard", tom: "indigo" as const },
    { rotulo: "Postagens desta semana", valor: postSemana, href: "/postagens?view=semana", icone: "calendar", tom: "indigo" as const },
    { rotulo: "Conteúdos atrasados", valor: atrasados.length, href: "/conteudos?atrasado=1", destaque: true, icone: "alert", tom: "vermelho" as const },
    { rotulo: "Aguardando gravação", valor: conta("Aguardando gravação"), href: linkStatus("Aguardando gravação"), icone: "video", tom: "ambar" as const },
    { rotulo: "Gravados", valor: conta("Gravado"), href: linkStatus("Gravado"), icone: "film", tom: "azul" as const },
    { rotulo: "Fila de edição", valor: conta("Fila de edição"), href: "/fila-edicao", icone: "scissors", tom: "ambar" as const },
    { rotulo: "Em edição", valor: conta("Em edição"), href: linkStatus("Em edição"), icone: "edit", tom: "ambar" as const },
    { rotulo: "Em aprovação", valor: emAprovacao, href: linkStatus("Aprovação do cliente"), icone: "eye", tom: "indigo" as const },
    { rotulo: "Prontos para publicar", valor: prontosPublicar, href: linkStatus("Aprovado"), icone: "check-circle", tom: "verde" as const },
    { rotulo: "Gravados no mês", valor: gravadosMes, href: "/gravacoes", icone: "film", tom: "azul" as const },
    { rotulo: "Publicados no mês", valor: publicadosMes, href: linkStatus("Publicado"), icone: "send", tom: "verde" as const },
  ];

  // Atenção esta semana
  const naSemana = (c: Content) =>
    c.planned_date != null && mesmaSemana(parseData(c.planned_date)!, hoje);
  const semResponsavel = (c: Content) =>
    !c.planner_id && !c.recorder_id && !c.editor_id && !c.publisher_id;

  const atencao: { titulo: string; itens: Content[] }[] = [
    { titulo: "Urgentes", itens: contents.filter((c) => c.priority === "Urgente" && naoFinal(c)) },
    { titulo: "Atrasados", itens: atrasados },
    { titulo: "Da semana sem gravação", itens: contents.filter((c) => naSemana(c) && c.requires_recording && !estaGravado(c.status)) },
    { titulo: "Da semana sem edição", itens: contents.filter((c) => naSemana(c) && (c.status === "Gravado" || c.status === "Fila de edição")) },
    { titulo: "Aguardando aprovação", itens: contents.filter((c) => GRUPO_EM_APROVACAO.includes(c.status)) },
    { titulo: "Sem data", itens: contents.filter((c) => !c.planned_date && naoFinal(c)) },
    { titulo: "Sem responsável", itens: contents.filter((c) => semResponsavel(c) && naoFinal(c)) },
  ];

  // Próximas postagens
  const proximas = contents
    .filter((c) => c.planned_date && c.planned_date >= hojeStr && naoFinal(c))
    .sort((a, b) => (a.planned_date! < b.planned_date! ? -1 : 1))
    .slice(0, 8);

  // Resumo por cliente
  const resumoClientes = clientes
    .map((cl) => {
      // Capa não é conteúdo — não conta no resumo do cliente.
      const doCliente = contents.filter(
        (c) => c.client_id === cl.id && !ehCapa(c),
      );
      return {
        cliente: cl,
        planejados: doCliente.filter((c) => c.status !== "Cancelado").length,
        publicados: doCliente.filter((c) => c.status === "Publicado").length,
        pendentes: doCliente.filter((c) => naoFinal(c)).length,
        aguardandoGravacao: doCliente.filter((c) => c.status === "Aguardando gravação").length,
        emEdicao: doCliente.filter((c) => c.status === "Em edição").length,
      };
    })
    .filter((r) => r.planejados > 0);

  // Gráficos
  const porStatus = STATUS_OPTIONS.map((s) => ({ label: s, value: conta(s) })).filter(
    (d) => d.value > 0,
  );
  const publicadosPorCliente = clientes
    .map((cl) => ({
      label: cl.name,
      value: contents.filter(
        (c) =>
          c.client_id === cl.id &&
          c.status === "Publicado" &&
          !ehCapa(c) &&
          (c.actual_post_date ?? c.planned_date ?? "").slice(0, 7) === mesAtual,
      ).length,
      cor: cl.color ?? "#4f46e5",
    }))
    .filter((d) => d.value > 0);
  const gravadosPorCliente = clientes
    .map((cl) => ({
      label: cl.name,
      value: contents.filter((c) => c.client_id === cl.id && gravadoNoMes(c)).length,
      cor: cl.color ?? "#4f46e5",
    }))
    .filter((d) => d.value > 0);

  return (
    <>
      <PageHeader titulo="Dashboard" descricao="Visão geral da produção" icone="dashboard" tom="indigo" />

      {/* Cards principais — primeira coisa do dashboard */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <StatCard key={c.rotulo} {...c} />
        ))}
      </div>

      {/* Agora: o que cada uma está fazendo neste momento */}
      <div className="mt-8">
        <AgoraPanel contents={contents} perfis={perfis} clientes={clientes} />
      </div>

      {/* Atenção esta semana */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Atenção esta semana
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {atencao.map((grupo) => (
            <Card key={grupo.titulo}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">
                    {grupo.titulo}
                  </h3>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {grupo.itens.length}
                  </span>
                </div>
                {grupo.itens.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-500">Tudo certo por aqui.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {grupo.itens.slice(0, 5).map((c) => {
                      const cl = clientesById.get(c.client_id);
                      return (
                        <li key={c.id} className="text-sm">
                          <Link
                            href={`/clientes/${c.client_id}`}
                            className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-brand-700"
                          >
                            <span
                              className="inline-block h-2 w-2 shrink-0 rounded-full border border-gray-200"
                              style={{ backgroundColor: cl?.color ?? "#e5e7eb" }}
                              aria-hidden="true"
                            />
                            <span className="truncate hover:underline">
                              {cl?.name ?? "—"}
                            </span>
                          </Link>
                          <Link
                            href={`/conteudos/${c.id}`}
                            className="block truncate text-gray-700 hover:text-brand-700"
                          >
                            {c.title}
                          </Link>
                        </li>
                      );
                    })}
                    {grupo.itens.length > 5 ? (
                      <li className="text-xs text-gray-500">
                        +{grupo.itens.length - 5} outros…
                      </li>
                    ) : null}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Gráficos */}
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Gravados por cliente no mês
              </h3>
              <span className="text-xs font-medium text-gray-500">
                {gravadosMes} no total
              </span>
            </div>
            {gravadosPorCliente.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-500">
                Nenhum vídeo gravado neste mês ainda.
              </p>
            ) : (
              <BarChart dados={gravadosPorCliente} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Publicados por cliente no mês
              </h3>
              <span className="text-xs font-medium text-gray-500">
                {publicadosMes} no total
              </span>
            </div>
            <BarChart dados={publicadosPorCliente} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Conteúdos por status
            </h3>
            <BarChart dados={porStatus} />
          </CardContent>
        </Card>
      </div>

      {/* Próximas postagens (só leitura — clique para abrir) */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Próximas postagens
          </h2>
          <Link
            href="/conteudos"
            className="text-xs font-medium text-brand-700 hover:underline"
          >
            Ver todos →
          </Link>
        </div>
        {proximas.length === 0 ? (
          <EmptyState
            titulo="Nenhuma postagem futura"
            descricao="Conteúdos com data prevista aparecerão aqui."
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-gray-100">
              {proximas.map((c) => {
                const cl = clientesById.get(c.client_id);
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50"
                  >
                    <span className="w-20 shrink-0 text-xs font-medium text-gray-500">
                      {formatarData(c.planned_date)}
                    </span>
                    <Link
                      href={`/conteudos/${c.id}`}
                      className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 hover:text-brand-700"
                    >
                      {c.title}
                    </Link>
                    <Link
                      href={`/clientes/${c.client_id}`}
                      className="hidden items-center gap-1.5 text-xs text-gray-500 hover:text-brand-700 sm:flex"
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full border border-gray-200"
                        style={{ backgroundColor: cl?.color ?? "#e5e7eb" }}
                        aria-hidden="true"
                      />
                      <span className="hover:underline">{cl?.name ?? "—"}</span>
                    </Link>
                    <StatusContentBadge status={c.status} arte={ehArte(c.format)} />
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Resumo por cliente */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Resumo por cliente
        </h2>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Planejados</th>
                  <th className="px-4 py-3 font-medium">Publicados</th>
                  <th className="px-4 py-3 font-medium">Pendentes</th>
                  <th className="px-4 py-3 font-medium">Aguard. gravação</th>
                  <th className="px-4 py-3 font-medium">Em edição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resumoClientes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                      Sem conteúdos cadastrados.
                    </td>
                  </tr>
                ) : (
                  resumoClientes.map((r) => (
                    <tr key={r.cliente.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/clientes/${r.cliente.id}`}
                          className="flex items-center gap-2 font-medium text-gray-900 hover:text-brand-700"
                        >
                          <span
                            className="inline-block h-3 w-3 rounded-full border border-gray-200"
                            style={{ backgroundColor: r.cliente.color ?? "#e5e7eb" }}
                            aria-hidden="true"
                          />
                          {r.cliente.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.planejados}</td>
                      <td className="px-4 py-3 text-gray-600">{r.publicados}</td>
                      <td className="px-4 py-3 text-gray-600">{r.pendentes}</td>
                      <td className="px-4 py-3 text-gray-600">{r.aguardandoGravacao}</td>
                      <td className="px-4 py-3 text-gray-600">{r.emEdicao}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
