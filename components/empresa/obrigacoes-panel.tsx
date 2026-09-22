"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  atualizarObrigacaoAction,
  criarObrigacaoAction,
  desativarObrigacaoAction,
  desmarcarCumpridaAction,
  marcarCumpridaAction,
} from "@/lib/actions/empresa";
import { rotuloPeriodo, textoPrazo } from "@/lib/empresa/obrigacoes";
import { toast } from "@/lib/ui/toast";
import { cn, formatarData } from "@/lib/utils";
import {
  OBRIGACAO_FORM_PADRAO,
  obrigacaoFormSchema,
  type ObrigacaoFormValues,
} from "@/lib/validation/empresa";
import { MESES_CURTOS, OBLIGATION_CADENCE_OPTIONS } from "@/types";
import type { ObrigacaoComPrazo } from "@/lib/data/empresa";

interface ObrigacoesPanelProps {
  obrigacoes: ObrigacaoComPrazo[];
  /** Área que a tela representa — pré-selecionada no formulário. */
  area: "contabil" | "administrativo";
}

/**
 * Obrigações com prazo próprio.
 *
 * São os prazos que NÃO são despesa — declaração anual, renovação de
 * alvará. Despesa com prazo (DAS, contabilidade) continua vindo do
 * financeiro, que é onde o dinheiro vive.
 */
export function ObrigacoesPanel({ obrigacoes, area }: ObrigacoesPanelProps) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | "nova" | null>(null);
  const [processando, iniciar] = useTransition();

  function marcar(o: ObrigacaoComPrazo) {
    const periodo = o.aberto?.periodo;
    iniciar(async () => {
      const r = await marcarCumpridaAction(o.id, periodo);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível marcar.");
        return;
      }
      toast.sucesso(
        `${o.title} — ${rotuloPeriodo(periodo ?? "")} marcado como cumprido.`,
      );
      router.refresh();
    });
  }

  function desmarcar(o: ObrigacaoComPrazo, periodo: string) {
    iniciar(async () => {
      const r = await desmarcarCumpridaAction(o.id, periodo);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível desfazer.");
        return;
      }
      router.refresh();
    });
  }

  function desativar(o: ObrigacaoComPrazo) {
    iniciar(async () => {
      const r = await desativarObrigacaoAction(o.id);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível desativar.");
        return;
      }
      toast.sucesso("Obrigação desativada. O histórico foi mantido.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {obrigacoes.map((o) =>
        editando === o.id ? (
          <ObrigacaoForm
            key={o.id}
            obrigacao={o}
            area={area}
            aoConcluir={() => setEditando(null)}
          />
        ) : (
          <div
            key={o.id}
            className={cn(
              "rounded-xl border bg-white p-3.5",
              o.aberto?.situacao === "Atrasada"
                ? "border-alerta"
                : "border-gray-200",
            )}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="min-w-0 flex-1 text-sm font-medium text-gray-900">
                {o.title}
              </span>

              {o.aberto ? (
                <span
                  className={cn(
                    "shrink-0 text-xs font-semibold",
                    o.aberto.situacao === "Atrasada"
                      ? "text-alerta"
                      : o.aberto.situacao === "Vence em breve"
                        ? "text-area"
                        : "text-gray-500",
                  )}
                >
                  {rotuloPeriodo(o.aberto.periodo)} · {textoPrazo(o.aberto)}
                </span>
              ) : (
                <span className="shrink-0 text-xs text-gray-400">nada em aberto</span>
              )}
            </div>

            <p className="mt-1 text-xs text-gray-500">
              {o.cadence}
              {o.cadence === "Única"
                ? o.due_date
                  ? ` · ${formatarData(o.due_date)}`
                  : ""
                : o.cadence === "Anual"
                  ? ` · todo dia ${o.due_day} de ${MESES_CURTOS[(o.due_month ?? 1) - 1]}`
                  : o.cadence === "Trimestral"
                    ? ` · dia ${o.due_day}, a partir de ${MESES_CURTOS[(o.due_month ?? 1) - 1]}`
                    : ` · todo dia ${o.due_day}`}
              {` · aviso ${o.alert_days} dia(s) antes`}
              {o.cumpridos.length > 0 ? ` · ${o.cumpridos.length} cumprido(s)` : ""}
            </p>

            {o.notes ? (
              <p className="mt-1.5 text-sm text-gray-600">{o.notes}</p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              {o.aberto ? (
                <Button tamanho="sm" onClick={() => marcar(o)} disabled={processando}>
                  Marcar {rotuloPeriodo(o.aberto.periodo)} como feito
                </Button>
              ) : null}
              {o.cumpridos.length > 0 ? (
                <Button
                  tamanho="sm"
                  variante="secundaria"
                  onClick={() => desmarcar(o, [...o.cumpridos].sort().reverse()[0])}
                  disabled={processando}
                >
                  Desfazer o último
                </Button>
              ) : null}
              <Button
                tamanho="sm"
                variante="secundaria"
                onClick={() => setEditando(o.id)}
              >
                Editar
              </Button>
              <Button
                tamanho="sm"
                variante="fantasma"
                onClick={() => desativar(o)}
                disabled={processando}
              >
                Desativar
              </Button>
            </div>
          </div>
        ),
      )}

      {editando === "nova" ? (
        <ObrigacaoForm area={area} aoConcluir={() => setEditando(null)} />
      ) : (
        <Button variante="secundaria" onClick={() => setEditando("nova")}>
          Nova obrigação
        </Button>
      )}

      {obrigacoes.length === 0 && editando !== "nova" ? (
        <p className="text-sm text-gray-500">
          Nenhuma obrigação cadastrada nesta área. Use isto para prazos que não são
          despesa — a declaração anual, a renovação do alvará. DAS e contabilidade
          já vêm do financeiro.
        </p>
      ) : null}
    </div>
  );
}

/** Formulário de obrigação. Os campos mudam conforme a periodicidade. */
function ObrigacaoForm({
  obrigacao,
  area,
  aoConcluir,
}: {
  obrigacao?: ObrigacaoComPrazo;
  area: "contabil" | "administrativo";
  aoConcluir: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ObrigacaoFormValues>(
    obrigacao
      ? {
          title: obrigacao.title,
          area: obrigacao.area === "administrativo" ? "administrativo" : "contabil",
          cadence: obrigacao.cadence,
          due_day: obrigacao.due_day ? String(obrigacao.due_day) : "",
          due_month: obrigacao.due_month ? String(obrigacao.due_month) : "",
          due_date: obrigacao.due_date ?? "",
          alert_days: String(obrigacao.alert_days),
          notes: obrigacao.notes ?? "",
        }
      : { ...OBRIGACAO_FORM_PADRAO, area },
  );
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  function set<K extends keyof ObrigacaoFormValues>(c: K, v: ObrigacaoFormValues[K]) {
    setValues((atual) => ({ ...atual, [c]: v }));
  }

  const unica = values.cadence === "Única";
  const precisaMes = values.cadence === "Anual" || values.cadence === "Trimestral";

  function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem(null);

    const parsed = obrigacaoFormSchema.safeParse(values);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      const novos: Record<string, string> = {};
      for (const [c, m] of Object.entries(fe)) if (m?.length) novos[c] = m[0];
      setErros(novos);
      return;
    }
    setErros({});

    iniciar(async () => {
      const r = obrigacao
        ? await atualizarObrigacaoAction(obrigacao.id, parsed.data)
        : await criarObrigacaoAction(parsed.data);

      if (!r.ok) {
        setErros(r.fieldErrors ?? {});
        setMensagem(r.error ?? "Não foi possível salvar.");
        return;
      }
      aoConcluir();
      router.refresh();
    });
  }

  const erro = (c: string) =>
    erros[c] ? <p className="mt-1 text-xs text-alerta">{erros[c]}</p> : null;

  return (
    <form
      onSubmit={aoEnviar}
      className="space-y-4 rounded-xl border border-area bg-white p-4"
      noValidate
    >
      {mensagem ? <Alert variante="erro">{mensagem}</Alert> : null}

      <div>
        <Label htmlFor="o-title">O que é *</Label>
        <Input
          id="o-title"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Ex.: Renovação do alvará de funcionamento"
          aria-invalid={Boolean(erros.title)}
        />
        {erro("title")}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="o-cadence">Com que frequência *</Label>
          <Select
            id="o-cadence"
            value={values.cadence}
            onChange={(e) =>
              set("cadence", e.target.value as ObrigacaoFormValues["cadence"])
            }
          >
            {OBLIGATION_CADENCE_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        {unica ? (
          <div>
            <Label htmlFor="o-date">Data *</Label>
            <Input
              id="o-date"
              type="date"
              value={values.due_date ?? ""}
              onChange={(e) => set("due_date", e.target.value)}
              aria-invalid={Boolean(erros.due_date)}
            />
            {erro("due_date")}
          </div>
        ) : (
          <div>
            <Label htmlFor="o-day">Dia do vencimento *</Label>
            <Input
              id="o-day"
              inputMode="numeric"
              value={values.due_day ?? ""}
              onChange={(e) => set("due_day", e.target.value)}
              placeholder="15"
              aria-invalid={Boolean(erros.due_day)}
            />
            {erro("due_day") ?? (
              <p className="mt-1 text-xs text-gray-500">
                Dia que não existe no mês cai no último.
              </p>
            )}
          </div>
        )}

        {precisaMes ? (
          <div>
            <Label htmlFor="o-month">
              {values.cadence === "Anual" ? "Mês *" : "Mês inicial *"}
            </Label>
            <Select
              id="o-month"
              value={values.due_month ?? ""}
              onChange={(e) => set("due_month", e.target.value)}
              aria-invalid={Boolean(erros.due_month)}
            >
              <option value="">Selecione...</option>
              {MESES_CURTOS.map((m, i) => (
                <option key={m} value={String(i + 1)}>
                  {m}
                </option>
              ))}
            </Select>
            {erro("due_month") ??
              (values.cadence === "Trimestral" ? (
                <p className="mt-1 text-xs text-gray-500">
                  Repete de 3 em 3 meses a partir dele.
                </p>
              ) : null)}
          </div>
        ) : (
          <div>
            <Label htmlFor="o-alert">Avisar quantos dias antes</Label>
            <Input
              id="o-alert"
              inputMode="numeric"
              value={values.alert_days ?? ""}
              onChange={(e) => set("alert_days", e.target.value)}
              placeholder="7"
              aria-invalid={Boolean(erros.alert_days)}
            />
            {erro("alert_days")}
          </div>
        )}
      </div>

      {precisaMes ? (
        <div className="sm:w-1/3">
          <Label htmlFor="o-alert2">Avisar quantos dias antes</Label>
          <Input
            id="o-alert2"
            inputMode="numeric"
            value={values.alert_days ?? ""}
            onChange={(e) => set("alert_days", e.target.value)}
            placeholder="30"
            aria-invalid={Boolean(erros.alert_days)}
          />
          {erro("alert_days")}
        </div>
      ) : null}

      <div>
        <Label htmlFor="o-notes">Observações</Label>
        <Textarea
          id="o-notes"
          rows={2}
          value={values.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Onde se faz, com quem, o que precisa em mãos..."
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : obrigacao ? "Salvar" : "Criar obrigação"}
        </Button>
        <Button type="button" variante="secundaria" onClick={aoConcluir} disabled={salvando}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
