"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { FORMAT_OPTIONS, WEEK_OPTIONS } from "@/types";
import {
  analisarPlanejamentoAction,
  importarConteudosAction,
} from "@/lib/actions/import";
import type { ItemPlanejamento } from "@/lib/import/planning-parser";
import type { OpcaoCliente } from "@/lib/data/contents";

interface ImportPlanningProps {
  clientes: OpcaoCliente[];
}

export function ImportPlanning({ clientes }: ImportPlanningProps) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [mes, setMes] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [itens, setItens] = useState<ItemPlanejamento[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, iniciar] = useTransition();

  function analisar() {
    setErro(null);
    if (!clientId) return setErro("Selecione o cliente.");
    if (!/^\d{4}-\d{2}$/.test(mes)) return setErro("Selecione o mês de referência.");
    if (!arquivo) return setErro("Selecione o arquivo .docx do planejamento.");

    const fd = new FormData();
    fd.set("arquivo", arquivo);
    fd.set("reference_month", mes);

    iniciar(async () => {
      const r = await analisarPlanejamentoAction(fd);
      if (!r.ok || !r.itens) {
        setErro(r.error ?? "Falha ao ler o arquivo.");
        return;
      }
      setItens(r.itens);
    });
  }

  function alterarItem(i: number, campo: keyof ItemPlanejamento, valor: unknown) {
    setItens((lista) =>
      lista
        ? lista.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it))
        : lista,
    );
  }

  function removerItem(i: number) {
    setItens((lista) => (lista ? lista.filter((_, idx) => idx !== i) : lista));
  }

  function criar() {
    if (!itens || itens.length === 0) return;
    setErro(null);
    iniciar(async () => {
      const r = await importarConteudosAction({
        clientId,
        referenceMonth: mes,
        itens,
      });
      if (!r.ok) {
        setErro(r.error ?? "Falha ao criar os conteúdos.");
        return;
      }
      router.push(`/clientes/${clientId}`);
      router.refresh();
    });
  }

  // ---------- Etapa 1: upload ----------
  if (!itens) {
    return (
      <Card>
        <CardContent className="space-y-5">
          {erro ? <Alert variante="erro">{erro}</Alert> : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cliente">Cliente *</Label>
              <Select
                id="cliente"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="mes">Mês de referência *</Label>
              <Input
                id="mes"
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="arquivo">Documento do planejamento (.docx) *</Label>
            <input
              id="arquivo"
              type="file"
              accept=".docx"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
            />
            <p className="mt-1 text-xs text-gray-500">
              O mesmo documento que a Vitória já entrega. O sistema lê e separa
              os conteúdos automaticamente.
            </p>
          </div>

          <Button onClick={analisar} disabled={processando}>
            {processando ? "Lendo o documento..." : "Analisar planejamento"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ---------- Etapa 2: prévia ----------
  return (
    <div className="space-y-4">
      {erro ? <Alert variante="erro">{erro}</Alert> : null}
      <Alert variante="sucesso">
        <strong>{itens.length}</strong> conteúdo(s) detectado(s). Confira e ajuste
        se precisar antes de criar.
      </Alert>

      <div className="space-y-3">
        {itens.map((it, i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
                <div className="sm:col-span-5">
                  <Label htmlFor={`t${i}`}>Título</Label>
                  <Input
                    id={`t${i}`}
                    value={it.titulo}
                    onChange={(e) => alterarItem(i, "titulo", e.target.value)}
                  />
                </div>
                <div className="sm:col-span-3">
                  <Label htmlFor={`f${i}`}>Formato</Label>
                  <Select
                    id={`f${i}`}
                    value={it.formato}
                    onChange={(e) => alterarItem(i, "formato", e.target.value)}
                  >
                    {FORMAT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`s${i}`}>Semana</Label>
                  <Select
                    id={`s${i}`}
                    value={it.semana != null ? String(it.semana) : ""}
                    onChange={(e) =>
                      alterarItem(
                        i,
                        "semana",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  >
                    <option value="">—</option>
                    {WEEK_OPTIONS.map((w) => (
                      <option key={w} value={String(w)}>
                        {w}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`d${i}`}>Data</Label>
                  <Input
                    id={`d${i}`}
                    type="date"
                    value={it.dataPrevista ?? ""}
                    onChange={(e) =>
                      alterarItem(i, "dataPrevista", e.target.value || null)
                    }
                  />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {it.precisaGravacao ? "Precisa de gravação" : "Sem gravação"}
                  {it.local ? ` · ${it.local}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => removerItem(i)}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Remover
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={criar} disabled={processando || itens.length === 0}>
          {processando ? "Criando..." : `Criar ${itens.length} conteúdo(s)`}
        </Button>
        <Button
          variante="secundaria"
          onClick={() => setItens(null)}
          disabled={processando}
        >
          Voltar
        </Button>
      </div>
    </div>
  );
}
