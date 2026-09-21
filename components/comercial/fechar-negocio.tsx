"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fecharNegocioAction, perderNegocioAction } from "@/lib/actions/comercial";
import { propostaVigente } from "@/lib/comercial/funil";
import { proximoMes, rotuloMes } from "@/lib/financeiro/meses";
import { toast } from "@/lib/ui/toast";
import { formatarMoeda } from "@/lib/utils";
import { fechamentoSchema, type FechamentoValues } from "@/lib/validation/comercial";
import type { LeadWithRelations } from "@/types";

/**
 * O fechamento do negócio. Ganhar pede os dados do contrato porque é
 * o que vira a mensalidade no financeiro; perder pede só o motivo.
 */
export function FecharNegocio({ lead }: { lead: LeadWithRelations }) {
  const router = useRouter();
  const [aba, setAba] = useState<"nada" | "ganhar" | "perder">("nada");
  const [values, setValues] = useState<FechamentoValues>({
    mesInicio: proximoMes(new Date().toISOString().slice(0, 7)),
    meses: "12",
    diaVencimento: "10",
  });
  const [motivo, setMotivo] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [processando, iniciar] = useTransition();

  const proposta = propostaVigente(lead.proposals);
  const mensal = proposta
    ? Number(proposta.monthly_amount)
    : Number(lead.estimated_monthly);
  const meses = values.meses ? Number(values.meses) : 0;

  function ganhar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem(null);

    const parsed = fechamentoSchema.safeParse(values);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      const novos: Record<string, string> = {};
      for (const [c, m] of Object.entries(fe)) if (m?.length) novos[c] = m[0];
      setErros(novos);
      return;
    }
    setErros({});

    iniciar(async () => {
      const r = await fecharNegocioAction(lead.id, parsed.data);
      if (!r.ok) {
        setErros(r.fieldErrors ?? {});
        setMensagem(r.error ?? "Não foi possível fechar.");
        return;
      }
      toast.sucesso(
        `${r.criou?.cliente} virou cliente, com mensalidade de ${formatarMoeda(r.criou?.mensal ?? 0)}.`,
      );
      router.refresh();
    });
  }

  function perder() {
    iniciar(async () => {
      const r = await perderNegocioAction(lead.id, motivo);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível encerrar.");
        return;
      }
      toast.sucesso("Oportunidade marcada como perdida.");
      router.refresh();
    });
  }

  if (aba === "nada") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setAba("ganhar")}>Ganhamos</Button>
        <Button variante="secundaria" onClick={() => setAba("perder")}>
          Perdemos
        </Button>
      </div>
    );
  }

  if (aba === "perder") {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900">
          Por que essa não deu certo?
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          Anotar o motivo é o que, daqui a seis meses, mostra o padrão do que
          faz a agência perder negócio.
        </p>
        <Input
          className="mt-3"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ex.: achou caro, fechou com concorrente, sumiu"
          aria-label="Motivo da perda"
        />
        <div className="mt-3 flex gap-2">
          <Button variante="perigo" onClick={perder} disabled={processando}>
            {processando ? "Encerrando..." : "Marcar como perdida"}
          </Button>
          <Button variante="secundaria" onClick={() => setAba("nada")} disabled={processando}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={ganhar} className="rounded-xl border border-area bg-white p-4" noValidate>
      <h3 className="text-sm font-semibold text-gray-900">
        Fechar o contrato de {lead.name}
      </h3>
      <p className="mt-1 text-xs text-gray-500">
        Isso cria o cliente, cadastra a mensalidade no financeiro e define a
        vigência — tudo de uma vez.
      </p>

      {mensagem ? (
        <div className="mt-3">
          <Alert variante="erro">{mensagem}</Alert>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="f-mes">Primeira mensalidade *</Label>
          <Input
            id="f-mes"
            type="month"
            value={values.mesInicio}
            onChange={(e) => setValues((v) => ({ ...v, mesInicio: e.target.value }))}
            aria-invalid={Boolean(erros.mesInicio)}
          />
          {erros.mesInicio ? (
            <p className="mt-1 text-xs text-alerta">{erros.mesInicio}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="f-meses">Duração (meses)</Label>
          <Input
            id="f-meses"
            inputMode="numeric"
            value={values.meses ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, meses: e.target.value }))}
            placeholder="12"
            aria-invalid={Boolean(erros.meses)}
          />
          {erros.meses ? (
            <p className="mt-1 text-xs text-alerta">{erros.meses}</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">Vazio = sem prazo.</p>
          )}
        </div>
        <div>
          <Label htmlFor="f-dia">Dia do vencimento</Label>
          <Input
            id="f-dia"
            inputMode="numeric"
            value={values.diaVencimento ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, diaVencimento: e.target.value }))}
            placeholder="10"
            aria-invalid={Boolean(erros.diaVencimento)}
          />
          {erros.diaVencimento ? (
            <p className="mt-1 text-xs text-alerta">{erros.diaVencimento}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-area-soft p-3 text-sm text-gray-700">
        <p className="font-semibold text-area">O que vai acontecer</p>
        <ul className="mt-1.5 space-y-0.5 text-xs">
          <li>
            Cliente <strong>{lead.name}</strong> criado e ativo.
          </li>
          <li>
            Mensalidade de <strong>{formatarMoeda(mensal)}</strong>
            {proposta ? " (valor da proposta)" : " (valor estimado)"}, a partir de{" "}
            <strong>{rotuloMes(values.mesInicio)}</strong>
            {meses > 0 ? ` por ${meses} meses` : " sem prazo definido"}.
          </li>
          {proposta && Number(proposta.setup_amount) > 0 ? (
            <li>
              Entrada de{" "}
              <strong>{formatarMoeda(Number(proposta.setup_amount))}</strong> lançada
              como projeto avulso.
            </li>
          ) : null}
          {proposta?.monthly_goal ? (
            <li>
              Meta de <strong>{proposta.monthly_goal} conteúdos/mês</strong> no cadastro
              do cliente.
            </li>
          ) : null}
        </ul>
      </div>

      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={processando}>
          {processando ? "Fechando..." : "Confirmar e criar cliente"}
        </Button>
        <Button
          type="button"
          variante="secundaria"
          onClick={() => setAba("nada")}
          disabled={processando}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
