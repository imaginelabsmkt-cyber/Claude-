"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { formatarDataHora } from "@/lib/utils";
import {
  adicionarComentarioAction,
  excluirComentarioAction,
} from "@/lib/actions/comments";
import type { Comment } from "@/types";

interface ComentarioView extends Comment {
  autor: string;
}

interface CommentsSectionProps {
  contentId: string;
  comentarios: ComentarioView[];
  usuarioAtualId: string | null;
}

/** Área de comentários: listar, adicionar e excluir o próprio. */
export function CommentsSection({
  contentId,
  comentarios,
  usuarioAtualId,
}: CommentsSectionProps) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    iniciar(async () => {
      const r = await adicionarComentarioAction(contentId, texto);
      if (!r.ok) {
        setErro(r.error ?? "Não foi possível comentar.");
        return;
      }
      setTexto("");
      router.refresh();
    });
  }

  function excluir(id: string) {
    setErro(null);
    iniciar(async () => {
      const r = await excluirComentarioAction(id, contentId);
      if (!r.ok) {
        setErro(r.error ?? "Não foi possível excluir.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {comentarios.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum comentário ainda.</p>
      ) : (
        <ul className="space-y-3">
          {comentarios.map((c) => (
            <li key={c.id} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {c.autor}
                </span>
                <span className="text-xs text-gray-400">
                  {formatarDataHora(c.created_at)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                {c.comment}
              </p>
              {usuarioAtualId && c.user_id === usuarioAtualId ? (
                <button
                  type="button"
                  onClick={() => excluir(c.id)}
                  disabled={enviando}
                  className="mt-2 text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                >
                  Excluir
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {erro ? <Alert variante="erro">{erro}</Alert> : null}

      <form onSubmit={enviar} className="space-y-2">
        <Textarea
          rows={3}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva um comentário..."
          aria-label="Novo comentário"
        />
        <Button type="submit" disabled={enviando || !texto.trim()}>
          {enviando ? "Enviando..." : "Comentar"}
        </Button>
      </form>
    </div>
  );
}
