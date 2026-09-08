"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  criarCategoriaAction,
  definirAtivaCategoriaAction,
  salvarConfiguracaoFinanceiraAction,
} from "@/lib/actions/financeiro";
import { rotuloMes } from "@/lib/financeiro/meses";
import { paraCampo } from "@/lib/financeiro/valores";
import { toast } from "@/lib/ui/toast";
import { formatarMoeda } from "@/lib/utils";
import { FINANCIAL_KIND_TONE } from "@/types";
import type { FinancialCategory, FinancialKind, FinancialSettings } from "@/types";

interface SettingsPanelProps {
  configuracao: FinancialSettings;
  categorias: FinancialCategory[];
}

/**
 * Configuração do módulo: saldo inicial da série (o "C3" da planilha) e
 * as categorias que organizam o fluxo de caixa.
 */
export function SettingsPanel({ configuracao, categorias }: SettingsPanelProps) {
  const router = useRouter();

  const [saldo, setSaldo] = useState(paraCampo(configuracao.opening_balance));
  const [mesInicial, setMesInicial] = useState(configuracao.opening_month);
  const [errosConfig, setErrosConfig] = useState<Record<string, string>>({});
  const [salvandoConfig, iniciarConfig] = useTransition();

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<FinancialKind>("Despesa");
  const [erroCategoria, setErroCategoria] = useState<string | null>(null);
  const [salvandoCategoria, iniciarCategoria] = useTransition();

  const [processando, iniciar] = useTransition();

  function salvarConfiguracao(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrosConfig({});
    iniciarConfig(async () => {
      const r = await salvarConfiguracaoFinanceiraAction({
        opening_balance: saldo,
        opening_month: mesInicial,
      });
      if (!r.ok) {
        setErrosConfig(r.fieldErrors ?? {});
        toast.erro(r.error ?? "Não foi possível salvar.");
        return;
      }
      toast.sucesso("Configuração salva. Os saldos foram recalculados.");
      router.refresh();
    });
  }

  function adicionarCategoria(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErroCategoria(null);
    iniciarCategoria(async () => {
      const r = await criarCategoriaAction({ name: nome, kind: tipo, active: true });
      if (!r.ok) {
        setErroCategoria(r.error ?? "Não foi possível salvar.");
        return;
      }
      setNome("");
      toast.sucesso("Categoria criada.");
      router.refresh();
    });
  }

  function alternarCategoria(c: FinancialCategory) {
    iniciar(async () => {
      const r = await definirAtivaCategoriaAction(c.id, !c.active);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível atualizar.");
        return;
      }
      router.refresh();
    });
  }

  const receitas = categorias.filter((c) => c.kind === "Receita");
  const despesas = categorias.filter((c) => c.kind === "Despesa");

  const listaCategorias = (lista: FinancialCategory[], titulo: string) => (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {titulo}
      </p>
      <div className="space-y-1.5">
        {lista.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2"
          >
            <span
              className={
                "flex items-center gap-2 text-sm " +
                (c.active ? "text-gray-800" : "text-gray-400 line-through")
              }
            >
              <Badge tom={FINANCIAL_KIND_TONE[c.kind]}>{c.kind}</Badge>
              {c.name}
            </span>
            <Button
              tamanho="sm"
              variante="fantasma"
              onClick={() => alternarCategoria(c)}
              disabled={processando}
            >
              {c.active ? "Desativar" : "Ativar"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Saldo inicial</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-gray-500">
            Quanto havia em caixa no primeiro mês controlado pelo sistema. A
            partir dele, o saldo final de cada mês vira o saldo inicial do mês
            seguinte, automaticamente.
          </p>

          <form onSubmit={salvarConfiguracao} className="grid gap-4 sm:grid-cols-3" noValidate>
            <div>
              <Label htmlFor="opening_balance">Saldo em caixa (R$)</Label>
              <Input
                id="opening_balance"
                inputMode="decimal"
                value={saldo}
                onChange={(e) => setSaldo(e.target.value)}
                placeholder="0,00"
                aria-invalid={Boolean(errosConfig.opening_balance)}
              />
              {errosConfig.opening_balance ? (
                <p className="mt-1 text-xs text-red-600">
                  {errosConfig.opening_balance}
                </p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="opening_month">Primeiro mês</Label>
              <Input
                id="opening_month"
                type="month"
                value={mesInicial}
                onChange={(e) => setMesInicial(e.target.value)}
                aria-invalid={Boolean(errosConfig.opening_month)}
              />
              {errosConfig.opening_month ? (
                <p className="mt-1 text-xs text-red-600">{errosConfig.opening_month}</p>
              ) : null}
            </div>

            <div className="flex items-end">
              <Button type="submit" disabled={salvandoConfig}>
                {salvandoConfig ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>

          <p className="mt-3 text-xs text-gray-500">
            Atual: {formatarMoeda(configuracao.opening_balance)} em{" "}
            {rotuloMes(configuracao.opening_month)}.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categorias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-gray-500">
            As categorias são as linhas do resumo anual. Categorias já usadas
            não podem ser excluídas — desative-as para tirá-las dos
            formulários sem perder o histórico.
          </p>

          <form onSubmit={adicionarCategoria} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]" noValidate>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome da nova categoria"
              aria-label="Nome da nova categoria"
            />
            <Select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as FinancialKind)}
              aria-label="Tipo da categoria"
              className="sm:w-40"
            >
              <option value="Despesa">Despesa</option>
              <option value="Receita">Receita</option>
            </Select>
            <Button type="submit" disabled={salvandoCategoria || !nome.trim()}>
              {salvandoCategoria ? "Salvando..." : "Adicionar"}
            </Button>
          </form>

          {erroCategoria ? <Alert variante="erro">{erroCategoria}</Alert> : null}

          <div className="grid gap-6 lg:grid-cols-2">
            {listaCategorias(receitas, "Receitas")}
            {listaCategorias(despesas, "Despesas")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
