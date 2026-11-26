"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OrigemItem } from "@/components/interno/origem-item";
import {
  concluirDemandaAction,
  excluirDemandaAction,
  salvarDemandaAction,
  type DemandaDoFormulario,
} from "@/lib/actions/demandas";
import {
  AREAS_DA_DEMANDA,
  areaDaDemanda,
  concluidasRecentemente,
  filaDasDemandas,
  quemFaz,
  type Demanda,
  type ErroDeDemanda,
} from "@/lib/empresa/demandas";
import { prazoEmPalavras } from "@/lib/comercial/atividades";
import { toast } from "@/lib/ui/toast";

/**
 * As demandas internas na Fila de trabalho.
 *
 * A Fran: "tarefas avulsas da empresa que não são de cliente nem de
 * lead."
 *
 * As abertas entram nas MESMAS gavetas de urgência que a fila já tem,
 * pela mesma função. Não é uma lista própria do lado: era isso ou ter
 * duas noções de "atrasado" na mesma página.
 *
 * As concluídas dos últimos 7 dias ficam no fim, recolhidas. Elas
 * existem para dar como desfazer sem ir procurar: quem marca por
 * engano percebe na hora, e o lugar de corrigir é onde o engano
 * aconteceu.
 */

export interface DemandasPainelProps {
  demandas: Demanda[];
  responsaveis: { id: string; nome: string }[];
  /** O instante da tela, calculado no servidor. */
  agoraISO: string;
  /** Só a parte de criar, para o topo da fila. */
  apenasBotao?: boolean;
}

const VAZIO: DemandaDoFormulario = {
  title: "",
  area: "administrativo",
  assignedTo: "",
  dueDate: "",
  notes: "",
};

const ROTULO_DA_AREA: Record<string, string> = {
  administrativo: "Administrativo",
  comercial: "Comercial",
  financeiro: "Financeiro",
};

export function DemandasPainel({
  demandas,
  responsaveis,
  agoraISO,
}: DemandasPainelProps) {
  const router = useRouter();
  const agora = new Date(agoraISO);
  const [processando, iniciar] = useTransition();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Demanda | null>(null);
  const [excluindo, setExcluindo] = useState<Demanda | null>(null);
  const [form, setForm] = useState<DemandaDoFormulario>(VAZIO);
  const [erros, setErros] = useState<ErroDeDemanda[]>([]);

  const fila = filaDasDemandas(demandas, agora);
  const concluidas = concluidasRecentemente(demandas, agora);

  const erro = (campo: ErroDeDemanda["campo"]) =>
    erros.find((e) => e.campo === campo)?.mensagem;

  function abrirNova() {
    setEditando(null);
    setForm(VAZIO);
    setErros([]);
    setAberto(true);
  }

  function abrirEdicao(d: Demanda) {
    const dono = responsaveis.find((r) => r.nome === d.responsavel);
    setEditando(d);
    setForm({
      title: d.title,
      area: d.area,
      assignedTo: dono?.id ?? "",
      dueDate: d.due_date ?? "",
      notes: d.notes ?? "",
    });
    setErros([]);
    setAberto(true);
  }

  function salvar() {
    iniciar(async () => {
      const r = await salvarDemandaAction(form, editando?.id);
      if (!r.ok) {
        setErros(r.erros ?? []);
        if (r.error) toast.erro(r.error);
        return;
      }
      setAberto(false);
      setEditando(null);
      setForm(VAZIO);
      toast.sucesso(editando ? "Demanda salva." : "Demanda criada.");
      router.refresh();
    });
  }

  function concluir(d: Demanda, concluida: boolean) {
    iniciar(async () => {
      const r = await concluirDemandaAction(d.id, concluida);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível salvar.");
        return;
      }
      toast.sucesso(concluida ? "Demanda concluída." : "Demanda reaberta.");
      router.refresh();
    });
  }

  function excluir() {
    if (!excluindo) return;
    const alvo = excluindo;
    iniciar(async () => {
      const r = await excluirDemandaAction(alvo.id);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível excluir.");
        return;
      }
      setExcluindo(null);
      toast.sucesso("Demanda excluída.");
      router.refresh();
    });
  }

  function Linha({ d, atrasada }: { d: Demanda; atrasada?: boolean }) {
    const prazo = prazoEmPalavras(
      d.due_date ? `${d.due_date}T12:00:00-04:00` : null,
      agora,
    );
    return (
      <OrigemItem
        origem={areaDaDemanda(d)}
        titulo={d.title}
        descricao={`Demanda · ${quemFaz(d)}`}
        prazo={atrasada ? `venceu ${prazo}` : prazo}
        atrasado={atrasada}
        acao={
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => abrirEdicao(d)}
              className="rounded px-1.5 py-0.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => setExcluindo(d)}
              className="rounded px-1.5 py-0.5 text-xs font-medium text-gray-400 hover:bg-alerta-soft hover:text-alerta"
            >
              Excluir
            </button>
            <label className="ml-1 flex cursor-pointer items-center gap-1.5 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={false}
                disabled={processando}
                onChange={() => concluir(d, true)}
                aria-label={`Concluir ${d.title}`}
                className="h-4 w-4 accent-area"
              />
              Concluir
            </label>
          </span>
        }
      />
    );
  }

  const grupos: { titulo: string; itens: Demanda[]; atrasada?: boolean }[] = [
    { titulo: "Em atraso", itens: fila.atrasadas.map((a) => a.demanda), atrasada: true },
    { titulo: "Hoje", itens: fila.hoje.map((a) => a.demanda) },
    { titulo: "Depois", itens: fila.proximas.map((a) => a.demanda) },
    { titulo: "Sem prazo", itens: fila.semPrazo.map((a) => a.demanda) },
  ].filter((g) => g.itens.length > 0);

  return (
    <>
      <div className="mb-4">
        <Button variante="secundaria" onClick={abrirNova}>
          + Nova demanda
        </Button>
      </div>

      {grupos.length === 0 && concluidas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
          Nenhuma demanda interna aberta.
        </p>
      ) : null}

      {grupos.map((g) => (
        <div key={g.titulo} className="mb-4">
          <h3 className="mb-1.5 text-sm font-bold text-gray-900">
            {g.titulo} ({g.itens.length})
          </h3>
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {g.itens.map((d) => (
              <Linha key={d.id} d={d} atrasada={g.atrasada} />
            ))}
          </ul>
        </div>
      ))}

      {concluidas.length > 0 ? (
        <details className="mt-2 rounded-xl border border-gray-200 bg-white px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-gray-700">
            Concluídas nos últimos 7 dias ({concluidas.length})
          </summary>
          <ul className="mt-2 divide-y divide-gray-100">
            {concluidas.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2"
              >
                <span className="min-w-0 flex-1 basis-40 text-sm text-gray-500 line-through">
                  {d.title}
                </span>
                <span className="ml-auto flex shrink-0 items-center gap-2">
                  <span className="text-xs text-gray-500">{quemFaz(d)}</span>
                  <button
                    type="button"
                    onClick={() => concluir(d, false)}
                    disabled={processando}
                    className="rounded px-1.5 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  >
                    Desfazer
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {/* O formulário. Simples de propósito: cinco campos, e só o
          título é obrigatório. Demanda que custa caro para cadastrar
          não é cadastrada. */}
      {aberto ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
          onClick={() => !processando && setAberto(false)}
          role="dialog"
          aria-modal="true"
          aria-label={editando ? "Editar demanda" : "Nova demanda"}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              {editando ? "Editar demanda" : "Nova demanda"}
            </h2>

            <div className="space-y-3">
              <div>
                <Label htmlFor="d-title">O que precisa ser feito</Label>
                <Input
                  id="d-title"
                  value={form.title}
                  maxLength={140}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Pesquisar cartão de crédito com milhas"
                />
                {erro("title") ? (
                  <p className="mt-1 text-xs text-alerta">{erro("title")}</p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="d-area">Área</Label>
                  <Select
                    id="d-area"
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                  >
                    {AREAS_DA_DEMANDA.map((a) => (
                      <option key={a} value={a}>
                        {ROTULO_DA_AREA[a]}
                      </option>
                    ))}
                  </Select>
                  {erro("area") ? (
                    <p className="mt-1 text-xs text-alerta">{erro("area")}</p>
                  ) : null}
                </div>

                <div>
                  <Label htmlFor="d-dono">Responsável</Label>
                  <Select
                    id="d-dono"
                    value={form.assignedTo}
                    onChange={(e) =>
                      setForm({ ...form, assignedTo: e.target.value })
                    }
                  >
                    {/* "As duas" é a primeira opção porque é a
                        resposta mais comum numa empresa de duas
                        sócias. */}
                    <option value="">As duas</option>
                    {responsaveis.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nome}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="d-prazo">Prazo</Label>
                <Input
                  id="d-prazo"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                />
                {erro("due_date") ? (
                  <p className="mt-1 text-xs text-alerta">{erro("due_date")}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    Sem prazo também vale. Ela fica no fim da fila.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="d-notes">Observação</Label>
                <Textarea
                  id="d-notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variante="secundaria"
                onClick={() => setAberto(false)}
                disabled={processando}
              >
                Cancelar
              </Button>
              <Button onClick={salvar} disabled={processando}>
                {processando ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        aberto={excluindo !== null}
        titulo="Excluir esta demanda?"
        descricao={
          excluindo
            ? `"${excluindo.title}" sai do sistema. Para só tirar da fila, marque como concluída.`
            : ""
        }
        textoConfirmar="Excluir"
        varianteConfirmar="perigo"
        carregando={processando}
        aoConfirmar={excluir}
        aoCancelar={() => setExcluindo(null)}
      />
    </>
  );
}
