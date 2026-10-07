"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { organizarRoteiro } from "@/lib/portal/roteiro";
import { Button } from "@/components/ui/button";
import {
  PriorityBadge,
  StatusContentBadge,
} from "@/components/shared/status-badge";
import { toast } from "@/lib/ui/toast";
import { corPrioridade } from "@/lib/ui/prioridade";
import { estiloFormato } from "@/lib/ui/formato";
import { prazoPrincipal, ehArte } from "@/lib/rules/contents";
import {
  definirStatusConteudoAction,
  agendarSessaoEdicaoAction,
} from "@/lib/actions/contents";
import type { Content, ContentStatus } from "@/types";
import type { OpcaoCliente } from "@/lib/data/contents";

interface EditQueueProps {
  itens: Content[];
  clientes: OpcaoCliente[];
  /** Data de hoje (ISO), para a contagem de prazo, vinda do servidor. */
  hoje: string;
}

/** Diferença em dias (inteiros) entre uma data ISO e hoje. */
function diffDias(alvo: string, hoje: string): number {
  const [ay, am, ad] = alvo.split("-").map(Number);
  const [hy, hm, hd] = hoje.split("-").map(Number);
  return Math.round(
    (Date.UTC(ay, am - 1, ad) - Date.UTC(hy, hm - 1, hd)) / 86400000,
  );
}

/** Rótulo curto de prazo ("hoje", "amanhã", "em 3 dias", "atrasado 2d"). */
function rotuloPrazo(
  prazo: string | null,
  hoje: string,
): { txt: string; cor: string } | null {
  if (!prazo) return null;
  const d = diffDias(prazo, hoje);
  if (d < 0) return { txt: `atrasado ${Math.abs(d)}d`, cor: "text-red-600" };
  if (d === 0) return { txt: "hoje", cor: "text-red-600" };
  if (d === 1) return { txt: "amanhã", cor: "text-amber-600" };
  if (d <= 7) return { txt: `em ${d} dias`, cor: "text-amber-600" };
  return { txt: `em ${d} dias`, cor: "text-gray-400" };
}

/** Em qual grupo de urgência o item cai. */
function grupoUrgencia(prazo: string | null, hoje: string): 0 | 1 | 2 {
  if (!prazo) return 2;
  const d = diffDias(prazo, hoje);
  if (d <= 0) return 0; // atrasado / hoje
  if (d <= 7) return 1; // esta semana
  return 2; // próximas
}

const GRUPOS = [
  { titulo: "Atrasado / Hoje", cor: "text-red-600", ponto: "bg-red-500", pilula: "bg-red-100 text-red-700" },
  { titulo: "Esta semana", cor: "text-amber-600", ponto: "bg-amber-500", pilula: "bg-amber-100 text-amber-700" },
  { titulo: "Próximas", cor: "text-gray-500", ponto: "bg-gray-400", pilula: "bg-gray-100 text-gray-600" },
] as const;

/** Ações contextuais por status (rótulo -> novo status). */
function acoesPara(status: ContentStatus): { label: string; to: ContentStatus }[] {
  switch (status) {
    case "Gravado":
      return [
        { label: "Adicionar à fila", to: "Fila de edição" },
        { label: "Iniciar edição", to: "Em edição" },
      ];
    case "Fila de edição":
      return [{ label: "Iniciar edição", to: "Em edição" }];
    case "Em edição":
      return [
        { label: "Enviar para revisão", to: "Revisão interna" },
        { label: "Marcar como ajuste", to: "Ajustes" },
      ];
    case "Ajustes":
      return [{ label: "Finalizar ajustes", to: "Revisão interna" }];
    case "Revisão interna":
      return [{ label: "Marcar como aprovado", to: "Aprovado" }];
    default:
      return [];
  }
}

const CLASSE_MINI =
  "rounded-md border border-gray-300 bg-white px-1.5 py-0.5 text-xs text-gray-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50";

/**
 * Roteiro só-leitura, na formatação de tabela (FALA | CENAS), igual ao
 * conteúdo. Mostra só o roteiro (corta legenda/stories). Serve pra Fran bater
 * o olho sem sair da fila — dá pra deixar vários abertos ao mesmo tempo.
 */
function RoteiroLeitura({ script }: { script: string | null }) {
  const r = organizarRoteiro(script);
  if (!r || (r.linhas.length === 0 && r.paragrafos.length === 0)) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-400">
        Sem roteiro cadastrado neste conteúdo.
      </p>
    );
  }
  if (r.linhas.length > 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead>
            <tr className="bg-brand-50 text-[11px] font-bold uppercase tracking-wider text-brand-700">
              <th className="w-1/2 border-r border-brand-100 px-3 py-2">
                {r.colEsq}
              </th>
              <th className="w-1/2 px-3 py-2">{r.colDir}</th>
            </tr>
          </thead>
          <tbody>
            {r.linhas.map((linha, i) => (
              <tr key={i} className="border-t border-gray-100 align-top">
                <td className="whitespace-pre-wrap break-words border-r border-gray-100 px-3 py-2 leading-relaxed text-gray-900">
                  {linha.esq || "·"}
                </td>
                <td className="whitespace-pre-wrap break-words px-3 py-2 italic leading-relaxed text-gray-500">
                  {linha.dir || "·"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
      {r.paragrafos.map((p, i) => (
        <p
          key={i}
          className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800"
        >
          {p}
        </p>
      ))}
    </div>
  );
}

function ItemFila({
  content,
  cliente,
  hoje,
}: {
  content: Content;
  cliente?: OpcaoCliente;
  hoje: string;
}) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();
  const [verRoteiro, setVerRoteiro] = useState(false);
  const prazo = prazoPrincipal(content);
  const prazoLabel = rotuloPrazo(prazo, hoje);
  const est = estiloFormato(content.format);
  const primaria = acoesPara(content.status)[0];

  function mudarStatus(to: ContentStatus) {
    iniciar(async () => {
      const r = await definirStatusConteudoAction(content.id, to);
      if (!r.ok) toast.erro(r.error ?? "Não foi possível mudar o status.");
      router.refresh();
    });
  }

  function agendarEdicao(data: string | null) {
    iniciar(async () => {
      const r = await agendarSessaoEdicaoAction(content.id, data);
      if (!r.ok) toast.erro(r.error ?? "Não foi possível agendar a edição.");
      else toast.sucesso(data ? "Prazo da edição no Google" : "Edição desmarcada");
      router.refresh();
    });
  }

  return (
    <div
      style={{ borderLeftColor: corPrioridade(content.priority) }}
      className="rounded-lg border border-l-4 border-gray-200 bg-white p-2.5 shadow-sm"
    >
      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-gray-500">
            <span
              className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-bold uppercase"
              style={{ backgroundColor: est.fundo, color: est.texto }}
            >
              <span aria-hidden="true">{est.icone}</span>
              {est.curto}
            </span>
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full border border-gray-200"
              style={{ backgroundColor: cliente?.color ?? "#e5e7eb" }}
              aria-hidden="true"
            />
            <span className="truncate">{cliente?.name ?? "·"}</span>
            {prazoLabel ? (
              <span className={`shrink-0 font-semibold ${prazoLabel.cor}`}>
                · ⏰ {prazoLabel.txt}
              </span>
            ) : null}
            {content.revision_count > 0 ? (
              <span className="shrink-0 text-amber-600">
                · {content.revision_count} ajuste
                {content.revision_count > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setVerRoteiro((v) => !v)}
              title="Clique para ver o roteiro aqui"
              className="min-w-0 flex-1 truncate text-left font-medium text-gray-900 hover:text-brand-700"
            >
              {content.title}
            </button>
            <Link
              href={`/conteudos/${content.id}`}
              title="Abrir o conteúdo completo"
              className="shrink-0 text-gray-300 hover:text-brand-700"
            >
              ↗
            </Link>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <StatusContentBadge status={content.status} arte={ehArte(content.format)} />
          <PriorityBadge priority={content.priority} />
          {primaria ? (
            <Button
              tamanho="sm"
              variante="secundaria"
              disabled={processando}
              onClick={() => mudarStatus(primaria.to)}
            >
              {primaria.label}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Dia de editar = prazo da TAREFA no Google (não vira evento) */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
        <span className="font-medium">🗓️ Editar em:</span>
        <input
          type="date"
          value={content.editing_date ?? ""}
          disabled={processando}
          onChange={(e) => agendarEdicao(e.target.value || null)}
          className={CLASSE_MINI}
        />
        {content.editing_date ? (
          <button
            type="button"
            disabled={processando}
            onClick={() => agendarEdicao(null)}
            className="text-gray-400 hover:text-red-600"
          >
            limpar
          </button>
        ) : null}
      </div>

      {/* Roteiro aberto aqui mesmo (clicou no título). Vários podem ficar
          abertos ao mesmo tempo, pra editar vários vídeos lado a lado. */}
      {verRoteiro ? (
        <div className="mt-2 border-t border-gray-100 pt-2">
          <RoteiroLeitura script={content.script} />
        </div>
      ) : null}
    </div>
  );
}

/** Status em que a Fran está com a mão na massa (edição em andamento). */
const STATUS_EDITANDO: ContentStatus[] = ["Em edição", "Ajustes"];

/**
 * Fila de edição em duas áreas:
 *  1. "Editando agora", o que está EM EDIÇÃO / AJUSTES (trabalho ativo).
 *  2. "Na fila", o que ainda vai editar, agrupado por URGÊNCIA
 *     (Atrasado/Hoje, Esta semana, Próximas).
 * Cada card mostra formato, cliente e a contagem de prazo, e tem o controle
 * "Editar em" (bloco na Agenda).
 */
export function EditQueue({ itens, clientes, hoje }: EditQueueProps) {
  const clientesById = new Map(clientes.map((c) => [c.id, c]));

  // Separa o que está sendo editado agora do restante da fila.
  const editando = itens.filter((c) => STATUS_EDITANDO.includes(c.status));
  const naFila = itens.filter((c) => !STATUS_EDITANDO.includes(c.status));

  const baldes: Content[][] = [[], [], []];
  for (const c of naFila) baldes[grupoUrgencia(prazoPrincipal(c), hoje)].push(c);

  const renderItem = (c: Content) => (
    <ItemFila
      key={c.id}
      content={c}
      cliente={clientesById.get(c.client_id)}
      hoje={hoje}
    />
  );

  return (
    <div className="space-y-6">
      {editando.length > 0 ? (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <span aria-hidden="true">🎬</span>
            <span className="text-brand-700">Editando agora</span>
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700">
              {editando.length}
            </span>
          </h2>
          <div className="space-y-2">{editando.map(renderItem)}</div>
        </section>
      ) : null}

      {naFila.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <span className="h-px flex-1 bg-gray-200" aria-hidden="true" />
            Na fila
            <span className="h-px flex-1 bg-gray-200" aria-hidden="true" />
          </div>
          {GRUPOS.map((g, i) =>
            baldes[i].length === 0 ? null : (
              <section key={g.titulo}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <span className={`inline-block h-2 w-2 rounded-full ${g.ponto}`} aria-hidden="true" />
                  <span className={g.cor}>{g.titulo}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${g.pilula}`}>
                    {baldes[i].length}
                  </span>
                </h2>
                <div className="space-y-2">{baldes[i].map(renderItem)}</div>
              </section>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
