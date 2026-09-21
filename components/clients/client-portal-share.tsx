"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "@/lib/ui/toast";
import { Icon } from "@/components/ui/icon";
import {
  configurarPortalAction,
  regenerarLinkPortalAction,
} from "@/lib/actions/portal";

/**
 * Controle do painel do cliente (link secreto). O time liga/desliga, copia o
 * link e pode gerar um novo (revogando o antigo).
 */
export function ClientPortalShare({
  clientId,
  tokenInicial,
  ativoInicial,
}: {
  clientId: string;
  tokenInicial: string | null;
  ativoInicial: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [token, setToken] = useState<string | null>(tokenInicial);
  const [ativo, setAtivo] = useState(ativoInicial);
  const [origin, setOrigin] = useState("");
  const [salvando, iniciar] = useTransition();

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const link = token ? `${origin}/portal/${token}` : "";

  const ligarDesligar = (valor: boolean) =>
    iniciar(async () => {
      const r = await configurarPortalAction(clientId, valor);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível salvar.");
        return;
      }
      setAtivo(!!r.enabled);
      setToken(r.token ?? null);
      toast.sucesso(valor ? "Painel do cliente ativado" : "Painel desativado");
    });

  const gerarNovo = () =>
    iniciar(async () => {
      if (
        token &&
        !window.confirm(
          "Gerar um link novo? O link antigo para de funcionar na hora.",
        )
      )
        return;
      const r = await regenerarLinkPortalAction(clientId);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível gerar o link.");
        return;
      }
      setToken(r.token ?? null);
      setAtivo(true);
      toast.sucesso("Link novo gerado");
    });

  const copiar = () => {
    if (!link) return;
    navigator.clipboard
      .writeText(link)
      .then(() => toast.sucesso("Link copiado!"))
      .catch(() => toast.erro("Não foi possível copiar."));
  };

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/40">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        <Icon nome="send" className="h-4 w-4 text-brand-700" />
        <span className="text-sm font-semibold text-brand-800">
          Painel do cliente
        </span>
        <span
          className={
            "rounded-full px-2 py-0.5 text-[10px] font-bold " +
            (ativo
              ? "bg-green-100 text-green-700"
              : "bg-gray-200 text-gray-500")
          }
        >
          {ativo ? "ATIVO" : "DESLIGADO"}
        </span>
        <span className="ml-auto text-xs text-brand-700">
          {aberto ? "▲" : "▼"}
        </span>
      </button>

      {aberto ? (
        <div className="space-y-3 border-t border-brand-200 px-4 py-3">
          <p className="text-xs text-gray-600">
            Um link secreto para o cliente acompanhar, de forma limpa, o que vai
            ao ar, o que está em produção e as tarefas da semana. Sem senha —
            quem tem o link, vê. Gere um link novo para revogar o acesso.
          </p>

          {ativo && link ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700"
              />
              <button
                type="button"
                onClick={copiar}
                className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
              >
                Copiar
              </button>
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Abrir
              </a>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {ativo ? (
              <>
                <button
                  type="button"
                  onClick={() => ligarDesligar(false)}
                  disabled={salvando}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Desativar
                </button>
                <button
                  type="button"
                  onClick={gerarNovo}
                  disabled={salvando}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Gerar link novo
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => ligarDesligar(true)}
                disabled={salvando}
                className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {salvando ? "Ativando…" : "Ativar painel do cliente"}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
