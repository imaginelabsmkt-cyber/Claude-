"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  desconectarGoogleAction,
  reenviarTudoGoogleAction,
} from "@/lib/actions/google";
import { toast } from "@/lib/ui/toast";

interface Props {
  conectado: boolean;
  email: string | null;
  aviso?: string;
}

const AVISOS: Record<string, { tipo: "ok" | "erro"; texto: string }> = {
  ok: { tipo: "ok", texto: "Google conectado com sucesso." },
  erro: { tipo: "erro", texto: "Não deu para conectar. Tente de novo." },
  naoconfig: {
    tipo: "erro",
    texto: "A integração ainda não foi configurada no servidor.",
  },
  semrefresh: {
    tipo: "erro",
    texto:
      "O Google não devolveu a permissão. Remova o acesso em myaccount.google.com/permissions e conecte de novo.",
  },
};

/** Conectar / desconectar a conta Google (Agenda + Tarefas). */
export function GoogleConnection({ conectado, email, aviso }: Props) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();
  const msg = aviso ? AVISOS[aviso] : null;

  function desconectar() {
    iniciar(async () => {
      const r = await desconectarGoogleAction();
      if (!r.ok) toast.erro(r.error ?? "Falha ao desconectar.");
      else toast.sucesso("Google desconectado");
      router.refresh();
    });
  }

  function reenviar() {
    iniciar(async () => {
      const r = await reenviarTudoGoogleAction();
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível reenviar.");
        return;
      }
      toast.sucesso(
        `Reenviado: ${r.planejamentos ?? 0} planejamento(s) e ${r.conteudos ?? 0} conteúdo(s).`,
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {msg ? (
        <p
          className={`rounded-md px-3 py-2 text-xs ${
            msg.tipo === "ok"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {msg.texto}
        </p>
      ) : null}

      {conectado ? (
        <>
          <p className="text-sm text-gray-700">
            Conectado{email ? ` como ` : ""}
            {email ? <strong>{email}</strong> : ""}. As gravações viram{" "}
            <strong>eventos</strong> e as edições viram <strong>tarefas</strong>{" "}
            no seu Google.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={reenviar} disabled={processando}>
              {processando ? "Reenviando..." : "Reenviar tudo ao Google"}
            </Button>
            <Button
              type="button"
              variante="secundaria"
              onClick={desconectar}
              disabled={processando}
            >
              Desconectar Google
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            “Reenviar tudo” recria as reuniões, postagens, gravações e edições
            (tarefa + bloco na Agenda) nos calendários certos (Imagine Reuniões
            / Produção / Postagens) e corrige títulos antigos. Use se algo não
            apareceu na agenda.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            Conecte sua conta Google para que as gravações apareçam na sua
            Agenda (eventos) e as edições virem tarefas com o quadradinho de
            concluir.
          </p>
          <a href="/api/google/connect">
            <Button type="button">Conectar Google Agenda</Button>
          </a>
        </>
      )}
    </div>
  );
}
