import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActiveToggle } from "@/components/clients/active-toggle";
import { ContentCard } from "@/components/contents/content-card";
import { EditableContentsTable } from "@/components/contents/editable-contents-table";
import {
  ContentMonthCalendar,
  type CelulaDia,
  type ItemCalendario,
} from "@/components/contents/content-month-calendar";
import { DeletePlanningButton } from "@/components/contents/delete-planning-button";
import { obterCliente } from "@/lib/data/clients";
import { listContents, listProfiles } from "@/lib/data/contents";
import {
  resumoProducao,
  inicioDaSemana,
  hojeISO,
  GRUPO_EM_APROVACAO,
  GRUPO_PRONTOS_PUBLICAR,
} from "@/lib/rules/contents";
import type { Content, ContentStatus } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
  searchParams: { mes?: string };
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function Kpi({
  rotulo,
  valor,
  meta,
}: {
  rotulo: string;
  valor: number;
  meta?: number | null;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-gray-500">{rotulo}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">
          {valor}
          {meta != null ? (
            <span className="text-base font-medium text-gray-400"> / {meta}</span>
          ) : null}
        </p>
        {meta != null ? (
          <p className="mt-0.5 text-xs text-gray-500">meta do mês</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Secao({
  titulo,
  itens,
  cor,
}: {
  titulo: string;
  itens: Content[];
  cor?: string | null;
}) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
        {titulo}
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {itens.length}
        </span>
      </h3>
      {itens.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs text-gray-500">
          Nenhum conteúdo aqui.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {itens.map((c) => (
            <ContentCard key={c.id} content={c} cor={cor} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Painel operacional do cliente. */
export default async function ClientePage({ params, searchParams }: PageProps) {
  const cliente = await obterCliente(params.id);
  if (!cliente) notFound();

  const [todos, perfis] = await Promise.all([
    listContents({ client_id: cliente.id }),
    listProfiles(),
  ]);

  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "")
    ? searchParams.mes!
    : mesAtual;
  const [ano, mesN] = mes.split("-").map(Number);

  // Cards e seções referentes ao mês (por mês de referência)
  const doMes = todos.filter((c) => c.reference_month === mes);
  const resumo = resumoProducao(doMes);
  const planejados = doMes.filter((c) => c.status !== "Cancelado").length;
  const porStatus = (lista: ContentStatus[]) =>
    doMes.filter((c) => lista.includes(c.status));

  // Calendário: conteúdos pela DATA prevista dentro do mês exibido
  const primeiro = new Date(ano, mesN - 1, 1);
  const inicioGrade = inicioDaSemana(primeiro);
  const dias: CelulaDia[][] = [];
  for (let s = 0; s < 6; s++) {
    const semana: CelulaDia[] = [];
    for (let d = 0; d < 7; d++) {
      const data = addDays(inicioGrade, s * 7 + d);
      const iso = hojeISO(data);
      semana.push({
        iso,
        dia: data.getDate(),
        noMes: data.getMonth() === mesN - 1,
        hoje: iso === hojeISO(hoje),
      });
    }
    dias.push(semana);
  }

  const itensCalendario: ItemCalendario[] = todos
    .filter((c) => c.planned_date)
    .map((c) => ({
      id: c.id,
      title: c.title,
      format: c.format,
      iso: c.planned_date!,
    }));

  const tituloMes = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(primeiro);
  const mesDelta = (delta: number) => {
    const dt = new Date(ano, mesN - 1 + delta, 1);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
  };

  const clienteOpt = [
    { id: cliente.id, name: cliente.name, color: cliente.color },
  ];

  return (
    <>
      <Link
        href="/clientes"
        className="mb-4 inline-block text-sm text-brand-700 hover:underline"
      >
        ← Voltar para clientes
      </Link>

      <PageHeader
        titulo={cliente.name}
        descricao={
          cliente.niche ? `Nicho: ${cliente.niche}` : "Painel operacional"
        }
        acao={
          <div className="flex items-center gap-2">
            {cliente.active ? (
              <Badge tom="verde">Ativo</Badge>
            ) : (
              <Badge tom="cinza">Inativo</Badge>
            )}
            <Link href={`/clientes/${cliente.id}/editar`}>
              <Button variante="secundaria">Editar</Button>
            </Link>
            <ActiveToggle id={cliente.id} ativo={cliente.active} />
          </div>
        }
      />

      {/* Calendário do mês */}
      <ContentMonthCalendar
        titulo={tituloMes}
        dias={dias}
        itens={itensCalendario}
        hrefAnterior={`/clientes/${cliente.id}?mes=${mesDelta(-1)}`}
        hrefProximo={`/clientes/${cliente.id}?mes=${mesDelta(1)}`}
      />

      {/* Ações do mês */}
      <div className="mt-3 flex justify-end">
        <DeletePlanningButton
          clientId={cliente.id}
          mes={mes}
          quantidade={doMes.length}
          rotuloMes={tituloMes}
        />
      </div>

      {/* Cards de indicadores */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi
          rotulo="Planejados no mês"
          valor={planejados}
          meta={cliente.monthly_goal}
        />
        <Kpi rotulo="Aguardando gravação" valor={resumo.aguardandoGravacao} />
        <Kpi rotulo="Gravados" valor={resumo.gravados} />
        <Kpi rotulo="Fila de edição" valor={resumo.filaEdicao} />
        <Kpi rotulo="Em edição" valor={resumo.emEdicao} />
        <Kpi rotulo="Em aprovação" valor={resumo.emAprovacao} />
        <Kpi rotulo="Aprovados" valor={resumo.aprovados} />
        <Kpi rotulo="Publicados" valor={resumo.publicados} />
      </div>

      {/* Seções operacionais */}
      <div className="mt-8 space-y-8">
        <Secao titulo="Falta gravar" cor={cliente.color} itens={porStatus(["Aguardando gravação"])} />
        <Secao titulo="Já gravados" cor={cliente.color} itens={porStatus(["Gravado"])} />
        <Secao titulo="Fila de edição" cor={cliente.color} itens={porStatus(["Fila de edição", "Em edição", "Ajustes"])} />
        <Secao titulo="Em aprovação" cor={cliente.color} itens={porStatus(GRUPO_EM_APROVACAO)} />
        <Secao titulo="Prontos para publicar" cor={cliente.color} itens={porStatus(GRUPO_PRONTOS_PUBLICAR)} />
        <Secao titulo="Publicados no mês" cor={cliente.color} itens={porStatus(["Publicado"])} />
      </div>

      {/* Planilha editável */}
      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900">
            Todos os conteúdos do cliente
          </h2>
          <span className="text-[11px] text-gray-400">
            Edite qualquer campo direto na linha — salva sozinho.
          </span>
        </div>
        <EditableContentsTable
          contents={todos}
          clientes={clienteOpt}
          perfis={perfis}
          mostrarCliente={false}
          vazioTitulo="Nenhum conteúdo"
          vazioDescricao="Este cliente ainda não tem conteúdos cadastrados."
        />
      </div>
    </>
  );
}
