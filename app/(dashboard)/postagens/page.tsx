import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { WeekBoard } from "@/components/postagens/week-board";
import {
  MonthCalendar,
  type DiaCalendario,
} from "@/components/postagens/month-calendar";
import { ContentCard } from "@/components/contents/content-card";
import { listContents, listAllClients } from "@/lib/data/contents";
import {
  inicioDaSemana,
  hojeISO,
  parseData,
  difEmDias,
  estaGravado,
} from "@/lib/rules/contents";
import { cn } from "@/lib/utils";
import type { Content } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { view?: string; ref?: string; day?: string };
}

const DIAS_CURTOS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export default async function PostagensPage({ searchParams }: PageProps) {
  const view = searchParams.view === "mes" ? "mes" : "semana";
  const hoje = new Date();
  const hojeStr = hojeISO(hoje);

  const [contents, clientes] = await Promise.all([
    listContents({}),
    listAllClients(),
  ]);

  const comData = contents.filter((c) => c.planned_date);
  const contagem = new Map<string, number>();
  for (const c of comData) {
    if (c.planned_date)
      contagem.set(c.planned_date, (contagem.get(c.planned_date) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        titulo="Postagens"
        descricao="Agendamento das publicações por semana e por mês"
        acao={
          <div className="inline-flex rounded-lg border border-gray-300 p-0.5">
            <Link
              href="/postagens?view=semana"
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium",
                view === "semana"
                  ? "bg-brand-600 text-white"
                  : "text-gray-600 hover:bg-gray-100",
              )}
            >
              Semana
            </Link>
            <Link
              href="/postagens?view=mes"
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium",
                view === "mes"
                  ? "bg-brand-600 text-white"
                  : "text-gray-600 hover:bg-gray-100",
              )}
            >
              Mês
            </Link>
          </div>
        }
      />

      {view === "semana"
        ? renderSemana()
        : renderMes()}
    </>
  );

  // ---------------- Visão semanal ----------------
  function renderSemana() {
    const ancora = parseData(searchParams.ref ?? "") ?? hoje;
    const inicio = inicioDaSemana(ancora);
    const dias = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(inicio, i);
      const iso = hojeISO(d);
      return {
        iso,
        rotulo: String(d.getDate()),
        diaSemana: DIAS_CURTOS[i],
        hoje: iso === hojeStr,
      };
    });
    const fimIso = hojeISO(addDays(inicio, 6));
    const inicioIso = hojeISO(inicio);
    const daSemana = comData.filter(
      (c) => c.planned_date! >= inicioIso && c.planned_date! <= fimIso,
    );

    const hrefSemana = (delta: number) =>
      `/postagens?view=semana&ref=${hojeISO(addDays(inicio, delta))}`;

    // Seções
    const naoFinal = (c: Content) =>
      c.status !== "Publicado" && c.status !== "Cancelado";
    const atrasadas = comData.filter(
      (c) => naoFinal(c) && difEmDias(parseData(c.planned_date)!, hoje) < 0,
    );
    const semData = contents.filter((c) => !c.planned_date && naoFinal(c));
    const antecipaveis = contents.filter((c) => c.status === "Aprovado");
    const semGravacao = daSemana.filter(
      (c) => c.requires_recording && !estaGravado(c.status),
    );

    return (
      <>
        <div className="mb-3 flex items-center justify-between">
          <Link
            href={hrefSemana(-7)}
            className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          >
            ← Semana anterior
          </Link>
          <span className="text-sm font-medium text-gray-700">
            {inicio.getDate()}/{inicio.getMonth() + 1} —{" "}
            {addDays(inicio, 6).getDate()}/{addDays(inicio, 6).getMonth() + 1}
          </span>
          <Link
            href={hrefSemana(7)}
            className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          >
            Próxima semana →
          </Link>
        </div>

        <WeekBoard dias={dias} contents={daSemana} clientes={clientes} />

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SecaoLista titulo="Postagens atrasadas" itens={atrasadas} />
          <SecaoLista titulo="Postagens sem data" itens={semData} />
          <SecaoLista
            titulo="Aprovados que podem ser antecipados"
            itens={antecipaveis}
          />
          <SecaoLista
            titulo="Da semana ainda não gravados"
            itens={semGravacao}
          />
        </div>
      </>
    );
  }

  // ---------------- Visão mensal ----------------
  function renderMes() {
    const refMes = /^\d{4}-\d{2}$/.test(searchParams.ref ?? "")
      ? searchParams.ref!
      : `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    const [ano, mes] = refMes.split("-").map(Number);
    const primeiro = new Date(ano, mes - 1, 1);
    const inicioGrade = inicioDaSemana(primeiro);

    const semanas: DiaCalendario[][] = [];
    for (let s = 0; s < 6; s++) {
      const semana: DiaCalendario[] = [];
      for (let d = 0; d < 7; d++) {
        const data = addDays(inicioGrade, s * 7 + d);
        const iso = hojeISO(data);
        semana.push({
          iso,
          dia: data.getDate(),
          noMes: data.getMonth() === mes - 1,
          hoje: iso === hojeStr,
          quantidade: contagem.get(iso) ?? 0,
        });
      }
      semanas.push(semana);
    }

    const titulo = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(primeiro);

    const mesDelta = (delta: number) => {
      const d = new Date(ano, mes - 1 + delta, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };

    const diaSel = searchParams.day;
    const doDia = diaSel
      ? comData.filter((c) => c.planned_date === diaSel)
      : [];

    return (
      <>
        <MonthCalendar
          titulo={titulo}
          semanas={semanas}
          hrefAnterior={`/postagens?view=mes&ref=${mesDelta(-1)}`}
          hrefProximo={`/postagens?view=mes&ref=${mesDelta(1)}`}
          hrefDia={(iso) => `/postagens?view=mes&ref=${refMes}&day=${iso}`}
          diaSelecionado={diaSel}
        />

        {diaSel ? (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              Conteúdos de {diaSel.split("-").reverse().join("/")}
            </h2>
            {doDia.length === 0 ? (
              <Card>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Nenhuma postagem neste dia.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {doDia.map((c) => (
                  <ContentCard
                    key={c.id}
                    content={c}
                    clienteNome={
                      clientes.find((cl) => cl.id === c.client_id)?.name ?? "—"
                    }
                    cor={clientes.find((cl) => cl.id === c.client_id)?.color}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs text-gray-500">
            Clique em um dia para ver os conteúdos.
          </p>
        )}
      </>
    );
  }

  // ---------------- Seção auxiliar ----------------
  function SecaoLista({ titulo, itens }: { titulo: string; itens: Content[] }) {
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
          <div className="space-y-2">
            {itens.slice(0, 8).map((c) => (
              <ContentCard
                key={c.id}
                content={c}
                clienteNome={
                  clientes.find((cl) => cl.id === c.client_id)?.name ?? "—"
                }
                cor={clientes.find((cl) => cl.id === c.client_id)?.color}
              />
            ))}
            {itens.length > 8 ? (
              <p className="text-xs text-gray-500">
                +{itens.length - 8} outros…
              </p>
            ) : null}
          </div>
        )}
      </section>
    );
  }
}
