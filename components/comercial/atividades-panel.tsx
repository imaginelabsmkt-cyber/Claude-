"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  concluirAtividadeAction,
  criarAtividadeAction,
  excluirAtividadeAction,
} from "@/lib/actions/comercial";
import { momentoDaAtividade, prazoEmPalavras } from "@/lib/comercial/atividades";
import { toast } from "@/lib/ui/toast";
import { cn } from "@/lib/utils";
import {
  ATIVIDADE_FORM_PADRAO,
  atividadeFormSchema,
  type AtividadeFormValues,
} from "@/lib/validation/comercial";
import { ACTIVITY_KIND_OPTIONS } from "@/types";
import type { AtividadeComDono } from "@/lib/data/comercial";

/**
 * As atividades de uma oportunidade (ou de um cliente).
 *
 * Do raio-X do Zoho: "atividade é tudo o que alguém precisa fazer com
 * um cliente, e toda atividade fica presa a um registro"; e, na
 * recomendação, "um módulo só de atividades com campo tipo (tarefa,
 * reunião, ligação, WhatsApp) já resolve. O que não pode faltar é o
 * vínculo com o cliente e o alerta de atraso."
 *
 * O formulário tem DOIS campos à vista, o que fazer e quando, e o
 * tipo numa caixinha do lado. Anotar "ligar quinta" não pode custar
 * mais do que anotar no papel, senão não se anota.
 */
export function AtividadesPanel({
  leadId,
  clientId,
  atividades,
  agoraISO,
}: {
  leadId?: string;
  clientId?: string;
  atividades: AtividadeComDono[];
  /** O "agora" do servidor, para o prazo não mudar na hidratação. */
  agoraISO: string;
}) {
  const router = useRouter();
  const agora = new Date(agoraISO);

  const [aberto, setAberto] = useState(false);
  const [values, setValues] = useState<AtividadeFormValues>(
    ATIVIDADE_FORM_PADRAO,
  );
  const [erros, setErros] = useState<Record<string, string>>({});
  const [excluindo, setExcluindo] = useState<AtividadeComDono | null>(null);
  const [processando, iniciar] = useTransition();

  function criar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = atividadeFormSchema.safeParse(values);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      const novos: Record<string, string> = {};
      for (const [c, m] of Object.entries(fe)) if (m?.length) novos[c] = m[0];
      setErros(novos);
      return;
    }
    setErros({});

    iniciar(async () => {
      const r = await criarAtividadeAction({ leadId, clientId }, parsed.data);
      if (!r.ok) {
        setErros(r.fieldErrors ?? {});
        toast.erro(r.error ?? "Não foi possível criar.");
        return;
      }
      setValues(ATIVIDADE_FORM_PADRAO);
      setAberto(false);
      router.refresh();
    });
  }

  function alternar(a: AtividadeComDono) {
    iniciar(async () => {
      const r = await concluirAtividadeAction(a.id, !a.done_at);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível salvar.");
        return;
      }
      router.refresh();
    });
  }

  function confirmarExclusao() {
    if (!excluindo) return;
    const id = excluindo.id;
    iniciar(async () => {
      const r = await excluirAtividadeAction(id);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível excluir.");
        return;
      }
      setExcluindo(null);
      router.refresh();
    });
  }

  return (
    <>
      {atividades.length === 0 && !aberto ? (
        <p className="mb-3 text-sm text-gray-500">
          Nenhuma atividade registrada.
        </p>
      ) : null}

      {atividades.length > 0 ? (
        <ul className="mb-3 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {atividades.map((a) => {
            const momento = momentoDaAtividade(a, agora);
            return (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5"
              >
                <input
                  type="checkbox"
                  checked={Boolean(a.done_at)}
                  onChange={() => alternar(a)}
                  disabled={processando}
                  aria-label={`Concluir "${a.subject}"`}
                  className="h-4 w-4 shrink-0 accent-area"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "text-sm",
                      a.done_at
                        ? "text-gray-400 line-through"
                        : "text-gray-900",
                    )}
                  >
                    {a.subject}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">{a.kind}</span>
                </span>
                {/* O que já foi feito não tem mais prazo: dizia
                    "atrasada há 5 dias" numa atividade concluída, que
                    é alarme por uma coisa que já aconteceu. */}
                <span
                  className={cn(
                    "shrink-0 text-xs",
                    a.done_at
                      ? "text-gray-400"
                      : momento === "atrasada"
                        ? "font-semibold text-alerta"
                        : momento === "hoje"
                          ? "font-semibold text-area"
                          : "text-gray-500",
                  )}
                >
                  {a.done_at
                    ? `feita ${prazoEmPalavras(a.done_at, agora)}`
                    : momento === "atrasada"
                      ? `venceu ${prazoEmPalavras(a.due_at, agora)}`
                      : prazoEmPalavras(a.due_at, agora)}
                </span>
                <button
                  type="button"
                  onClick={() => setExcluindo(a)}
                  disabled={processando}
                  className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-gray-500 hover:bg-alerta-soft hover:text-alerta disabled:opacity-50"
                >
                  Excluir
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {aberto ? (
        <form
          onSubmit={criar}
          className="rounded-xl border border-gray-200 bg-gray-50 p-3"
          noValidate
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div>
              <Label htmlFor="a-assunto">Descrição</Label>
              <Input
                id="a-assunto"
                value={values.subject}
                onChange={(e) =>
                  setValues((v) => ({ ...v, subject: e.target.value }))
                }
                placeholder="Ex.: enviar proposta revisada"
                aria-invalid={Boolean(erros.subject)}
              />
              {erros.subject ? (
                <p className="mt-1 text-xs text-alerta">{erros.subject}</p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="a-tipo">Tipo</Label>
              <Select
                id="a-tipo"
                value={values.kind}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    kind: e.target.value as AtividadeFormValues["kind"],
                  }))
                }
              >
                {ACTIVITY_KIND_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="a-prazo">Prazo</Label>
              <Input
                id="a-prazo"
                type="datetime-local"
                value={values.due_at ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, due_at: e.target.value }))
                }
                aria-invalid={Boolean(erros.due_at)}
              />
              {erros.due_at ? (
                <p className="mt-1 text-xs text-alerta">{erros.due_at}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <Button type="submit" disabled={processando}>
              {processando ? "Salvando..." : "Registrar"}
            </Button>
            <Button
              type="button"
              variante="secundaria"
              onClick={() => setAberto(false)}
              disabled={processando}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <Button variante="secundaria" onClick={() => setAberto(true)}>
          Nova atividade
        </Button>
      )}

      <ConfirmDialog
        aberto={Boolean(excluindo)}
        titulo="Excluir atividade?"
        descricao={excluindo ? `"${excluindo.subject}" será removida.` : undefined}
        textoConfirmar="Excluir"
        varianteConfirmar="perigo"
        carregando={processando}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setExcluindo(null)}
      />
    </>
  );
}
