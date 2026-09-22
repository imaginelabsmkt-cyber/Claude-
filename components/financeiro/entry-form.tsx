"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  atualizarLancamentoAction,
  criarLancamentoAction,
} from "@/lib/actions/financeiro";
import { paraCampo } from "@/lib/financeiro/valores";
import {
  lancamentoFormSchema,
  lancamentoPadrao,
  type LancamentoFormValues,
} from "@/lib/validation/financeiro";
import { PAYMENT_METHOD_OPTIONS } from "@/types";
import { categoriasDaArea } from "@/lib/interno/classificacao";
import type {
  Client,
  FinancialCategory,
  FinancialEntry,
  TeamMember,
} from "@/types";

interface EntryFormProps {
  /** Mês de competência sugerido para um lançamento novo. */
  mes: string;
  categorias: FinancialCategory[];
  clientes: Pick<Client, "id" | "name" | "active">[];
  /** Equipe ativa — o campo só aparece em categoria de pessoas. */
  pessoas?: Pick<TeamMember, "id" | "name" | "kind">[];
  /** Quando informado, o formulário está em modo de edição. */
  lancamento?: FinancialEntry;
}

/**
 * Formulário de lançamento (criação e edição).
 * As categorias disponíveis acompanham o tipo escolhido (receita/despesa),
 * para não existir "despesa em categoria de receita".
 */
export function EntryForm({
  mes,
  categorias,
  clientes,
  pessoas = [],
  lancamento,
}: EntryFormProps) {
  const router = useRouter();
  const edicao = Boolean(lancamento);

  const [values, setValues] = useState<LancamentoFormValues>(
    lancamento
      ? {
          reference_month: lancamento.reference_month,
          kind: lancamento.kind,
          category_id: lancamento.category_id,
          client_id: lancamento.client_id ?? "",
          team_member_id: lancamento.team_member_id ?? "",
          description: lancamento.description,
          amount: paraCampo(Number(lancamento.amount)),
          status: lancamento.status,
          due_date: lancamento.due_date ?? "",
          paid_date: lancamento.paid_date ?? "",
          payment_method: lancamento.payment_method ?? "",
          notes: lancamento.notes ?? "",
        }
      : lancamentoPadrao(mes),
  );
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<
    { tipo: "sucesso" | "erro"; texto: string } | null
  >(null);
  const [salvando, iniciarSalvamento] = useTransition();

  const categoriasDoTipo = useMemo(
    () => categorias.filter((c) => c.kind === values.kind && c.active),
    [categorias, values.kind],
  );

  // Pró-labore e freelancers são pagamentos a pessoas: só nessas
  // categorias faz sentido perguntar a quem o lançamento se refere.
  const ehDePessoas = useMemo(() => {
    const nomes = categoriasDaArea("pessoas");
    const escolhida = categorias.find((c) => c.id === values.category_id);
    return Boolean(escolhida && nomes.includes(escolhida.name));
  }, [categorias, values.category_id]);

  function atualizar<K extends keyof LancamentoFormValues>(
    campo: K,
    valor: LancamentoFormValues[K],
  ) {
    setValues((v) => ({ ...v, [campo]: valor }));
  }

  /** Trocar o tipo invalida a categoria escolhida (ela pertence ao outro tipo). */
  function trocarTipo(kind: LancamentoFormValues["kind"]) {
    setValues((v) => ({ ...v, kind, category_id: "" }));
  }

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensagem(null);

    const parsed = lancamentoFormSchema.safeParse(values);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      const novos: Record<string, string> = {};
      for (const [campo, msgs] of Object.entries(fe)) {
        if (msgs && msgs.length) novos[campo] = msgs[0];
      }
      setErros(novos);
      return;
    }
    setErros({});

    iniciarSalvamento(async () => {
      const resultado = edicao
        ? await atualizarLancamentoAction(lancamento!.id, parsed.data)
        : await criarLancamentoAction(parsed.data);

      if (!resultado.ok) {
        setErros(resultado.fieldErrors ?? {});
        setMensagem({
          tipo: "erro",
          texto: resultado.error ?? "Não foi possível salvar.",
        });
        return;
      }

      router.push(`/interno/financeiro/lancamentos?mes=${parsed.data.reference_month}`);
      router.refresh();
    });
  }

  const erro = (campo: string) =>
    erros[campo] ? <p className="mt-1 text-xs text-red-600">{erros[campo]}</p> : null;

  return (
    <form onSubmit={aoEnviar} className="max-w-3xl space-y-5" noValidate>
      {mensagem ? (
        <Alert variante={mensagem.tipo === "sucesso" ? "sucesso" : "erro"}>
          {mensagem.texto}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="kind">Tipo *</Label>
          <Select
            id="kind"
            value={values.kind}
            onChange={(e) => trocarTipo(e.target.value as LancamentoFormValues["kind"])}
          >
            <option value="Receita">Receita (entrada)</option>
            <option value="Despesa">Despesa (saída)</option>
          </Select>
        </div>

        <div>
          <Label htmlFor="reference_month">Mês de competência *</Label>
          <Input
            id="reference_month"
            type="month"
            value={values.reference_month}
            onChange={(e) => atualizar("reference_month", e.target.value)}
            aria-invalid={Boolean(erros.reference_month)}
          />
          {erro("reference_month")}
        </div>
      </div>

      <div>
        <Label htmlFor="description">Descrição *</Label>
        <Input
          id="description"
          value={values.description}
          onChange={(e) => atualizar("description", e.target.value)}
          placeholder={
            values.kind === "Receita"
              ? "Ex.: Mensalidade Kiku Sushi"
              : "Ex.: Pró-labore Fran"
          }
          aria-invalid={Boolean(erros.description)}
        />
        {erro("description")}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="category_id">Categoria *</Label>
          <Select
            id="category_id"
            value={values.category_id}
            onChange={(e) => atualizar("category_id", e.target.value)}
            aria-invalid={Boolean(erros.category_id)}
          >
            <option value="">Selecione...</option>
            {categoriasDoTipo.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {erro("category_id")}
        </div>

        <div>
          <Label htmlFor="amount">Valor (R$) *</Label>
          <Input
            id="amount"
            inputMode="decimal"
            value={values.amount}
            onChange={(e) => atualizar("amount", e.target.value)}
            placeholder="1.700,00"
            aria-invalid={Boolean(erros.amount)}
          />
          {erro("amount")}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="client_id">Cliente</Label>
          <Select
            id="client_id"
            value={values.client_id ?? ""}
            onChange={(e) => atualizar("client_id", e.target.value)}
          >
            <option value="">— sem cliente —</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.active ? "" : " (inativo)"}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-gray-500">
            Vincular o cliente alimenta o faturamento por cliente.
          </p>
        </div>

        {ehDePessoas && pessoas.length > 0 ? (
          <div>
            <Label htmlFor="team_member_id">Para quem</Label>
            <Select
              id="team_member_id"
              value={values.team_member_id ?? ""}
              onChange={(e) => atualizar("team_member_id", e.target.value)}
            >
              <option value="">— não informado —</option>
              {pessoas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.kind})
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-gray-500">
              Faz o pagamento aparecer na tela de Pessoas.
            </p>
          </div>
        ) : null}

        <div>
          <Label htmlFor="status">Situação *</Label>
          <Select
            id="status"
            value={values.status}
            onChange={(e) =>
              atualizar("status", e.target.value as LancamentoFormValues["status"])
            }
          >
            <option value="Pendente">
              Pendente ({values.kind === "Receita" ? "a receber" : "a pagar"})
            </option>
            <option value="Pago">Pago (já entrou/saiu do caixa)</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="due_date">Vencimento</Label>
          <Input
            id="due_date"
            type="date"
            value={values.due_date ?? ""}
            onChange={(e) => atualizar("due_date", e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="paid_date">Data do pagamento</Label>
          <Input
            id="paid_date"
            type="date"
            value={values.paid_date ?? ""}
            onChange={(e) => atualizar("paid_date", e.target.value)}
            disabled={values.status !== "Pago"}
          />
        </div>

        <div>
          <Label htmlFor="payment_method">Forma de pagamento</Label>
          <Select
            id="payment_method"
            value={values.payment_method ?? ""}
            onChange={(e) => atualizar("payment_method", e.target.value)}
          >
            <option value="">—</option>
            {PAYMENT_METHOD_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          rows={3}
          value={values.notes ?? ""}
          onChange={(e) => atualizar("notes", e.target.value)}
          placeholder="Anotações internas sobre este lançamento"
        />
        {erro("notes")}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : edicao ? "Salvar alterações" : "Criar lançamento"}
        </Button>
        <Button
          type="button"
          variante="secundaria"
          onClick={() => router.back()}
          disabled={salvando}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
