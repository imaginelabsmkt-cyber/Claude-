import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { BarChart } from "@/components/dashboard/bar-chart";
import { ContentsTable } from "@/components/contents/contents-table";
import { listContents, listAllClients, listProfiles } from "@/lib/data/contents";
import {
  estaAtrasado,
  estaGravado,
  hojeISO,
  mesmaSemana,
  parseData,
  GRUPO_EM_APROVACAO,
  GRUPO_PRONTOS_PUBLICAR,
} from "@/lib/rules/contents";
import { STATUS_OPTIONS, type Content } from "@/types";

export const dynamic = "force-dynamic";

const linkStatus = (s: string) => `/conteudos?status=${encodeURIComponent(s)}`;

export default async function DashboardPage() {
  const hoje = new Date();
  const hojeStr = hojeISO(hoje);
  const mesAtual = hojeStr.slice(0, 7);

  const [contents, clientes, perfis] = await Promise.all([
    listContents({}),
    listAllClients(),
    listProfiles(),
  ]);

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
      (c.actual_post_date ?? c.planned_date ?? "").slice(0, 7) === mesAtual,
  ).length;
  const prontosPublicar = contents.filter((c) =>
    GRUPO_PRONTOS_PUBLICAR.includes(c.status),
  ).length;
  const emAprovacao = contents.filter((c) =>
    GRUPO_EM_APROVACAO.includes(c.status),
  ).length;

  const cards = [
    { rotulo: "Postagens desta semana", valor: postSemana, href: "/postagens?view=semana" },
    { rotulo: "Conteúdos atrasados", valor: atrasados.length, href: "/conteudos?atrasado=1", destaque: true },
    { rotulo: "Aguardando gravação", valor: conta("Aguardando gravação"), href: linkStatus("Aguardando gravação") },
    { rotulo: "Gravados", valor: conta("Gravado"), href: linkStatus("Gravado") },
    { rotulo: "Fila de edição", valor: conta("Fila de edição"), href: "/fila-edicao" },
    { rotulo: "Em edição", valor: conta("Em edição"), href: linkStatus("Em edição") },
    { rotulo: "Em aprovação", valor: emAprovacao, href: linkStatus("Aprovação do cliente") },
    { rotulo: "Prontos para publicar", valor: prontosPublicar, href: linkStatus("Aprovado") },
    { rotulo: "Publicados no mês", valor: publicadosMes, href: linkStatus("Publicado") },
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
      const doCliente = contents.filter((c) => c.client_id === cl.id);
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
          (c.actual_post_date ?? c.planned_date ?? "").slice(0, 7) === mesAtual,
      ).length,
      cor: cl.color ?? "#4f46e5",
    }))
    .filter((d) => d.value > 0);

  return (
    <>
      <PageHeader titulo="Dashboard" descricao="Visão geral da produção" />

      {/* Cards principais */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <StatCard key={c.rotulo} {...c} />
        ))}
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
                  <p className="mt-2 text-xs text-gray-400">Tudo certo por aqui.</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {grupo.itens.slice(0, 5).map((c) => (
                      <li key={c.id} className="truncate text-sm">
                        <Link
                          href={`/conteudos/${c.id}`}
                          className="text-gray-700 hover:text-brand-700"
                        >
                          {c.title}
                        </Link>
                      </li>
                    ))}
                    {grupo.itens.length > 5 ? (
                      <li className="text-xs text-gray-400">
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
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Conteúdos por status
            </h3>
            <BarChart dados={porStatus} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Publicados por cliente no mês
            </h3>
            <BarChart dados={publicadosPorCliente} />
          </CardContent>
        </Card>
      </div>

      {/* Próximas postagens */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Próximas postagens
        </h2>
        <ContentsTable
          contents={proximas}
          clientes={clientes}
          perfis={perfis}
          vazioTitulo="Nenhuma postagem futura"
          vazioDescricao="Conteúdos com data prevista aparecerão aqui."
        />
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
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
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
