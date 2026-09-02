"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UrgencyBadge } from "@/components/shared/urgency-badge";
import { corPrioridade } from "@/lib/ui/prioridade";
import { urgenciaConteudo } from "@/lib/rules/contents";
import { formatarData } from "@/lib/utils";
import {
  marcarComoGravadoAction,
  alterarDataGravacaoAction,
  adicionarFilaEdicaoAction,
  atualizarProducaoConteudoAction,
  limparAgendamentoGravacaoAction,
} from "@/lib/actions/contents";
import type { Content } from "@/types";

interface RecordingCardProps {
  content: Content;
  clienteNome: string;
  cor?: string | null;
}

/** Campo compacto: NÃO renderiza nada quando está vazio (sem poluir com "—"). */
function Campo({
  rotulo,
  valor,
}: {
  rotulo: string;
  valor: string | null | undefined;
}) {
  if (!valor || valor === "—") return null;
  return (
    <div>
      <span className="text-[10px] uppercase tracking-wide text-gray-400">
        {rotulo}
      </span>
      <p className="text-sm text-gray-700">{valor}</p>
    </div>
  );
}

/** Card operacional de uma gravação, com ações rápidas para a Fran. */
export function RecordingCard({
  content,
  clienteNome,
  cor,
}: RecordingCardProps) {
  const router = useRouter();
  const urg = urgenciaConteudo(content);
  const [processando, iniciar] = useTransition();
  const [editandoData, setEditandoData] = useState(false);
  const [data, setData] = useState(content.recording_date ?? "");
  const [hora, setHora] = useState(content.recording_time ?? "");
  const [erro, setErro] = useState<string | null>(null);

  const gravado = content.status === "Gravado";

  function executar(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) {
        setErro(r.error ?? "Falha na operação.");
        return;
      }
      setEditandoData(false);
      router.refresh();
    });
  }

  return (
    <div
      className="rounded-lg border border-l-4 border-gray-200 bg-white p-3 shadow-sm"
      style={{ borderLeftColor: corPrioridade(content.priority) }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full border border-gray-200"
              style={{ backgroundColor: cor ?? "#e5e7eb" }}
              aria-hidden="true"
            />
            {clienteNome}
          </div>
          <Link
            href={`/conteudos/${content.id}`}
            className="mt-0.5 block font-medium text-gray-900 hover:text-brand-700"
          >
            {content.title}
          </Link>
        </div>
        <div className="flex flex-col items-end gap-1">
          <UrgencyBadge urgencia={urg} />
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        <Campo
          rotulo="Data de gravação"
          valor={
            content.recording_date
              ? `${formatarData(content.recording_date)}${content.recording_time ? ` às ${content.recording_time}` : ""}`
              : null
          }
        />
        <Campo
          rotulo="Prazo de gravação"
          valor={content.recording_deadline ? formatarData(content.recording_deadline) : null}
        />
        <Campo
          rotulo="Prevista p/ postagem"
          valor={content.planned_date ? formatarData(content.planned_date) : null}
        />
        <Campo rotulo="Local" valor={content.recording_location} />
        <Campo rotulo="Roupa" valor={content.outfit} />
        <Campo rotulo="Participantes" valor={content.participants.length ? content.participants.join(", ") : null} />
        <Campo rotulo="Materiais" valor={content.required_materials.length ? content.required_materials.join(", ") : null} />
        <Campo rotulo="Observações" valor={content.notes} />
      </div>

      {editandoData ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-gray-500">
              Data da gravação
            </label>
            <Input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-gray-500">
              Horário
            </label>
            <Input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button
            tamanho="sm"
            disabled={processando || !data}
            onClick={() =>
              executar(() =>
                alterarDataGravacaoAction(content.id, data, hora || null),
              )
            }
          >
            Salvar
          </Button>
          <Button
            tamanho="sm"
            variante="secundaria"
            disabled={processando}
            onClick={() => setEditandoData(false)}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {!gravado ? (
            <Button
              tamanho="sm"
              disabled={processando}
              onClick={() => executar(() => marcarComoGravadoAction(content.id))}
            >
              Marcar como gravado
            </Button>
          ) : null}

          {gravado ? (
            <Button
              tamanho="sm"
              disabled={processando}
              onClick={() => executar(() => adicionarFilaEdicaoAction(content.id))}
            >
              Adicionar à fila de edição
            </Button>
          ) : null}

          <Button
            tamanho="sm"
            variante="secundaria"
            disabled={processando}
            onClick={() => setEditandoData(true)}
          >
            Alterar data
          </Button>

          {!gravado && content.recording_date ? (
            <Button
              tamanho="sm"
              variante="fantasma"
              disabled={processando}
              onClick={() =>
                executar(() => limparAgendamentoGravacaoAction(content.id))
              }
            >
              Desmarcar
            </Button>
          ) : null}

          {content.script_url ? (
            <a href={content.script_url} target="_blank" rel="noopener noreferrer">
              <Button tamanho="sm" variante="secundaria">
                Abrir roteiro
              </Button>
            </a>
          ) : null}

          <Link href={`/conteudos/${content.id}/editar`}>
            <Button tamanho="sm" variante="fantasma">
              Editar
            </Button>
          </Link>

          {!gravado ? (
            <Button
              tamanho="sm"
              variante="fantasma"
              disabled={processando}
              onClick={() =>
                executar(() =>
                  atualizarProducaoConteudoAction(content.id, {
                    requires_recording: false,
                  }),
                )
              }
            >
              Não precisa gravar
            </Button>
          ) : null}
        </div>
      )}

      {erro ? <p className="mt-2 text-xs text-red-600">{erro}</p> : null}
    </div>
  );
}
