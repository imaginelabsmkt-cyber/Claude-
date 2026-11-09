"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  atualizarContratoAction,
  criarContratoAction,
  excluirContratoAction,
  registrarReajusteAction,
} from "@/lib/actions/contratos";
import { hojeISO } from "@/lib/financeiro/meses";
import { paraCampo } from "@/lib/financeiro/valores";
import {
  diasAteOFim,
  mesesDeCasa,
  proximoReajuste,
  situacaoDoContrato,
  type SituacaoContrato,
} from "@/lib/empresa/contratos";
import { toast } from "@/lib/ui/toast";
import { cn, formatarData, formatarMoeda } from "@/lib/utils";
import {
  CONTRATO_FORM_PADRAO,
  contratoFormSchema,
  INDICES_DE_REAJUSTE,
  type ContratoFormValues,
} from "@/lib/validation/contratos";
import type { BadgeTone } from "@/types";

/** O seletor só precisa de id e nome: pedir o Client inteiro obrigaria
 *  a tela a carregar campos que ela não usa. */
export interface ClienteEscolhivel {
  id: string;
  name: string;
}
import type { ContratoComCliente } from "@/lib/data/contratos";

const TOM: Record<SituacaoContrato, BadgeTone> = {
  Vigente: "verde",
  "Vence em breve": "amarelo",
  Vencido: "vermelho",
  Pausado: "cinza",
  Encerrado: "cinza",
};

interface ContratosPanelProps {
  contratos: ContratoComCliente[];
  clientes: ClienteEscolhivel[];
  /**
   * Clientes ativos que ainda não têm contrato cadastrado.
   *
   * Entram na MESMA lista, no topo, em vez de virarem um aviso solto.
   * A lista é a relação dos clientes: um cliente que falta aqui é um
   * cliente que some da tela, e era isso que fazia a tela não bater
   * com a realidade.
   */
  semContrato?: ClienteEscolhivel[];
  /** Data de hoje em "YYYY-MM-DD", calculada no servidor. */
  hoje: string;
}

/**
 * Os contratos dos clientes.
 *
 * Antes isto era duas coisas que não se falavam: o PDF assinado, e uma
 * linha de valor no financeiro. Não dava para responder desde quando o
 * cliente é cliente, até quando o contrato vale, nem quando reajustar.
 */
export function ContratosPanel({
  contratos,
  clientes,
  semContrato = [],
  hoje,
}: ContratosPanelProps) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | "novo" | null>(null);
  /** Cliente já escolhido ao abrir o formulário a partir da linha dele. */
  const [clienteNovo, setClienteNovo] = useState<string | undefined>(undefined);
  const [excluindo, setExcluindo] = useState<ContratoComCliente | null>(null);
  const [processando, iniciar] = useTransition();

  function excluir() {
    if (!excluindo) return;
    const alvo = excluindo;
    iniciar(async () => {
      const r = await excluirContratoAction(alvo.id);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível excluir.");
        return;
      }
      setExcluindo(null);
      toast.sucesso("Contrato excluído.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <Button
        variante="secundaria"
        onClick={() => {
          setClienteNovo(undefined);
          setEditando("novo");
        }}
      >
        Novo contrato
      </Button>

      {editando === "novo" ? (
        <ContratoForm
          clientes={clientes}
          clienteInicial={clienteNovo}
          aoConcluir={() => setEditando(null)}
        />
      ) : null}

      {semContrato.length > 0 ? (
        <ul className="space-y-2">
          {semContrato.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-alerta bg-white px-4 py-3"
            >
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {c.name}
                  </span>
                  <Badge tom="vermelho">Sem contrato</Badge>
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  paga todo mês, mas o sistema não sabe desde quando, até
                  quando vale nem quando reajustar
                </span>
              </span>
              <Button
                variante="secundaria"
                tamanho="sm"
                onClick={() => {
                  setClienteNovo(c.id);
                  setEditando("novo");
                }}
              >
                Cadastrar contrato
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {contratos.length === 0 && semContrato.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
          Nenhum contrato cadastrado. Cada cliente tem um: desde quando é
          cliente, até quando vale, o que está incluído e quando reajustar.
        </p>
      ) : (
        <ul className="space-y-2">
          {contratos.map((c) =>
            editando === c.id ? (
              <li key={c.id}>
                <ContratoForm
                  clientes={clientes}
                  contrato={c}
                  aoConcluir={() => setEditando(null)}
                />
              </li>
            ) : (
              <Linha
                key={c.id}
                contrato={c}
                hoje={hoje}
                aoEditar={() => setEditando(c.id)}
                aoExcluir={() => setExcluindo(c)}
              />
            ),
          )}
        </ul>
      )}

      <ConfirmDialog
        aberto={excluindo !== null}
        titulo="Excluir este contrato?"
        descricao={
          excluindo
            ? `O contrato de ${excluindo.client?.name ?? "cliente"} sai do sistema. A cobrança dele no financeiro continua onde está.`
            : ""
        }
        textoConfirmar="Excluir"
        varianteConfirmar="perigo"
        carregando={processando}
        aoConfirmar={excluir}
        aoCancelar={() => setExcluindo(null)}
      />
    </div>
  );
}

function Linha({
  contrato,
  hoje,
  aoEditar,
  aoExcluir,
}: {
  contrato: ContratoComCliente;
  hoje: string;
  aoEditar: () => void;
  aoExcluir: () => void;
}) {
  const router = useRouter();
  const [reajustando, setReajustando] = useState(false);
  const [novoValor, setNovoValor] = useState("");
  const [processando, iniciar] = useTransition();

  const situacao = situacaoDoContrato(contrato, hoje);
  const dias = diasAteOFim(contrato, hoje);
  const meses = mesesDeCasa(contrato, hoje);
  const reajuste = proximoReajuste(contrato);

  function reajustar() {
    iniciar(async () => {
      const r = await registrarReajusteAction(contrato.id, novoValor);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível registrar.");
        return;
      }
      setReajustando(false);
      setNovoValor("");
      toast.sucesso("Reajuste registrado, e o financeiro já foi junto.");
      router.refresh();
    });
  }

  return (
    <li
      className={cn(
        "rounded-xl border bg-white px-4 py-3",
        situacao === "Vencido" ? "border-alerta" : "border-gray-200",
        contrato.status === "Encerrado" ? "opacity-60" : "",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">
              {contrato.client?.name ?? "Cliente removido"}
            </span>
            <Badge tom={TOM[situacao]}>{situacao}</Badge>
          </span>
          <span className="mt-0.5 block text-xs text-gray-500">
            desde {formatarData(contrato.start_date)}
            {meses > 0 ? ` (${meses} ${meses === 1 ? "mês" : "meses"} de casa)` : ""}
            {contrato.end_date
              ? ` · até ${formatarData(contrato.end_date)}`
              : " · sem data de fim"}
            {dias !== null && dias >= 0 && situacao === "Vence em breve"
              ? ` · faltam ${dias} dia(s)`
              : ""}
            {dias !== null && dias < 0 && situacao === "Vencido"
              ? ` · venceu há ${Math.abs(dias)} dia(s)`
              : ""}
          </span>
        </span>

        <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900">
          {formatarMoeda(Number(contrato.monthly_amount))}
        </span>

        <span className="flex shrink-0 gap-1">
          {contrato.readjust_index ? (
            <button
              type="button"
              onClick={() => {
                setReajustando((v) => !v);
                setNovoValor(paraCampo(Number(contrato.monthly_amount)));
              }}
              className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            >
              Reajustar
            </button>
          ) : null}
          <button
            type="button"
            onClick={aoEditar}
            className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={aoExcluir}
            className="rounded px-2 py-1 text-xs font-medium text-gray-400 hover:bg-alerta-soft hover:text-alerta"
          >
            Excluir
          </button>
        </span>
      </div>

      {contrato.scope ? (
        <p className="mt-2 border-l-4 border-area pl-3 text-xs text-gray-600">
          {contrato.scope}
        </p>
      ) : null}

      {contrato.readjust_index ? (
        <p className="mt-1.5 text-xs text-gray-500">
          Reajuste por {contrato.readjust_index}
          {reajuste ? `, previsto para ${formatarData(reajuste)}` : ""}
          {contrato.last_readjust
            ? ` · último em ${formatarData(contrato.last_readjust)}`
            : " · nunca reajustado"}
        </p>
      ) : null}

      {reajustando ? (
        <div className="mt-2.5 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-2.5">
          <div className="w-36">
            <Label htmlFor={`r-${contrato.id}`}>Novo valor</Label>
            <Input
              id={`r-${contrato.id}`}
              inputMode="decimal"
              value={novoValor}
              onChange={(e) => setNovoValor(e.target.value)}
            />
          </div>
          <Button onClick={reajustar} disabled={processando}>
            {processando ? "Registrando..." : "Registrar reajuste"}
          </Button>
          <Button variante="secundaria" onClick={() => setReajustando(false)}>
            Cancelar
          </Button>
          <p className="w-full text-xs text-gray-500">
            O sistema não calcula o índice: quem publica o {contrato.readjust_index}{" "}
            é o IBGE. Aqui você registra o valor novo, a data de hoje entra como
            o último reajuste, e a cobrança no financeiro acompanha.
          </p>
        </div>
      ) : null}
    </li>
  );
}

function ContratoForm({
  clientes,
  contrato,
  clienteInicial,
  aoConcluir,
}: {
  clientes: ClienteEscolhivel[];
  contrato?: ContratoComCliente;
  /** Cliente já escolhido quando o formulário abre pela linha dele. */
  clienteInicial?: string;
  aoConcluir: () => void;
}) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});

  const [valores, setValores] = useState<ContratoFormValues>(
    contrato
      ? {
          client_id: contrato.client_id,
          status: contrato.status,
          monthly_amount: paraCampo(Number(contrato.monthly_amount)),
          scope: contrato.scope ?? "",
          start_date: contrato.start_date,
          end_date: contrato.end_date ?? "",
          readjust_index: contrato.readjust_index ?? "",
          last_readjust: contrato.last_readjust ?? "",
          signed_at: contrato.signed_at ?? "",
          notes: contrato.notes ?? "",
        }
      : {
          ...CONTRATO_FORM_PADRAO,
          client_id: clienteInicial ?? clientes[0]?.id ?? "",
          start_date: hojeISO(),
        },
  );

  function campo<K extends keyof ContratoFormValues>(
    chave: K,
    valor: ContratoFormValues[K],
  ) {
    setValores((v) => ({ ...v, [chave]: valor }));
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setErros({});

    const parsed = contratoFormSchema.safeParse(valores);
    if (!parsed.success) {
      const campos: Record<string, string> = {};
      for (const [k, msgs] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (msgs && msgs.length) campos[k] = msgs[0];
      }
      setErros(campos);
      setErro("Verifique os campos destacados.");
      return;
    }

    iniciar(async () => {
      const r = contrato
        ? await atualizarContratoAction(contrato.id, parsed.data)
        : await criarContratoAction(parsed.data);

      if (!r.ok) {
        setErro(r.error ?? "Não foi possível salvar.");
        setErros(r.fieldErrors ?? {});
        return;
      }

      toast.sucesso(contrato ? "Contrato atualizado." : "Contrato cadastrado.");
      aoConcluir();
      router.refresh();
    });
  }

  const id = contrato?.id ?? "novo";

  return (
    <form onSubmit={enviar} className="rounded-xl border border-area bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`c-cliente-${id}`}>Cliente</Label>
          <Select
            id={`c-cliente-${id}`}
            value={valores.client_id}
            onChange={(e) => campo("client_id", e.target.value)}
          >
            <option value="">Escolher</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`c-valor-${id}`}>Mensalidade</Label>
          <Input
            id={`c-valor-${id}`}
            inputMode="decimal"
            value={valores.monthly_amount}
            onChange={(e) => campo("monthly_amount", e.target.value)}
            placeholder="2.200,00"
          />
        </div>
        <div>
          <Label htmlFor={`c-ini-${id}`}>Começou em</Label>
          <Input
            id={`c-ini-${id}`}
            type="date"
            value={valores.start_date}
            onChange={(e) => campo("start_date", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`c-fim-${id}`}>Vale até</Label>
          <Input
            id={`c-fim-${id}`}
            type="date"
            value={valores.end_date ?? ""}
            onChange={(e) => campo("end_date", e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-500">
            Em branco = sem data de fim combinada.
          </p>
        </div>
        <div>
          <Label htmlFor={`c-indice-${id}`}>Reajuste por</Label>
          <Input
            id={`c-indice-${id}`}
            list={`indices-${id}`}
            value={valores.readjust_index ?? ""}
            onChange={(e) => campo("readjust_index", e.target.value)}
            placeholder="IPCA"
          />
          <datalist id={`indices-${id}`}>
            {INDICES_DE_REAJUSTE.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-gray-500">
            Em branco = sem reajuste combinado.
          </p>
        </div>
        <div>
          <Label htmlFor={`c-status-${id}`}>Situação</Label>
          <Select
            id={`c-status-${id}`}
            value={valores.status}
            onChange={(e) =>
              campo("status", e.target.value as ContratoFormValues["status"])
            }
          >
            <option value="Ativo">Ativo</option>
            <option value="Pausado">Pausado</option>
            <option value="Encerrado">Encerrado</option>
          </Select>
        </div>
      </div>

      <div className="mt-3">
        <Label htmlFor={`c-escopo-${id}`}>O que está incluído</Label>
        <Textarea
          id={`c-escopo-${id}`}
          rows={3}
          value={valores.scope ?? ""}
          onChange={(e) => campo("scope", e.target.value)}
          placeholder="8 conteúdos por mês, stories diários, gestão de tráfego..."
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <Button type="submit" disabled={processando}>
          {processando ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variante="secundaria" onClick={aoConcluir}>
          Cancelar
        </Button>
      </div>

      {erro ? (
        <Alert variante="erro" className="mt-3">
          {erro}
        </Alert>
      ) : null}
      {Object.entries(erros).length > 0 ? (
        <ul className="mt-2 space-y-0.5 text-xs text-alerta">
          {Object.entries(erros).map(([c, msg]) => (
            <li key={c}>{msg}</li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
