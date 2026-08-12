"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  atualizarProducaoConteudoAction,
  type ContentStagePatch,
} from "@/lib/actions/contents";
import { toast } from "@/lib/ui/toast";
import { prazoEntrega } from "@/lib/rules/contents";
import type { Content } from "@/types";

const CLASSE_INPUT =
  "w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-60";

/**
 * Painel da CAPA do vídeo. A capa é uma arte simples (da Vitória): não tem
 * roteiro nem gravação. Só precisa do TÍTULO que vai na capa, do link da arte
 * final e do prazo. Se a capa tiver foto, a Fran marca a produção de fotos.
 */
export function CoverPanel({
  content,
  videoId,
  videoTitulo,
}: {
  content: Content;
  videoId: string | null;
  videoTitulo: string | null;
}) {
  const router = useRouter();
  const [salvando, iniciar] = useTransition();
  const [titulo, setTitulo] = useState(content.description ?? "");
  const [link, setLink] = useState(content.edited_file_url ?? "");

  useEffect(() => setTitulo(content.description ?? ""), [content.description]);
  useEffect(
    () => setLink(content.edited_file_url ?? ""),
    [content.edited_file_url],
  );

  const salvar = (patch: ContentStagePatch) =>
    iniciar(async () => {
      const r = await atualizarProducaoConteudoAction(content.id, patch);
      if (!r.ok) toast.erro(r.error ?? "Não foi possível salvar.");
      else toast.sucesso("Salvo");
      router.refresh();
    });

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-gray-900">🎨 Arte da capa</h2>
        {videoId ? (
          <Link
            href={`/conteudos/${videoId}`}
            className="text-xs font-medium text-brand-700 hover:underline"
          >
            ↗ Ver o vídeo{videoTitulo ? `: ${videoTitulo}` : ""}
          </Link>
        ) : null}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">
            Título que vai na capa
          </span>
          <textarea
            value={titulo}
            disabled={salvando}
            onChange={(e) => setTitulo(e.target.value)}
            onBlur={() => {
              if ((titulo || null) !== (content.description || null)) {
                salvar({ description: titulo || null });
              }
            }}
            rows={2}
            placeholder="Ex.: Seu corpo evoluiu. Seu rosto acompanhou?"
            className={`${CLASSE_INPUT} resize-y`}
          />
          <span className="mt-0.5 block text-[11px] text-gray-400">
            A frase/título que aparece na imagem da capa.
          </span>
        </label>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-medium text-gray-500">
            Link da arte final
          </span>
          <input
            type="url"
            value={link}
            disabled={salvando}
            placeholder="https://"
            onChange={(e) => setLink(e.target.value)}
            onBlur={() => {
              if ((link || null) !== (content.edited_file_url || null)) {
                salvar({ edited_file_url: link || null });
              }
            }}
            className={CLASSE_INPUT}
          />
        </label>

        <label className="mt-4 block sm:max-w-xs">
          <span className="mb-1 block text-xs font-medium text-gray-500">
            Prazo de entrega
          </span>
          <input
            type="date"
            defaultValue={content.editing_deadline ?? prazoEntrega(content) ?? ""}
            disabled={salvando}
            onChange={(e) => salvar({ editing_deadline: e.target.value || null })}
            className={CLASSE_INPUT}
          />
        </label>
      </div>
    </div>
  );
}
