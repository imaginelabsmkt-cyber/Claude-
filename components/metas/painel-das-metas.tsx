"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CampoSalvo } from "@/components/metas/campo-salvo";
import {
  criarContratacaoAction,
  excluirContratacaoAction,
  salvarContratacaoAction,
  salvarPremissaAction,
  salvarRitmoAction,
} from "@/lib/actions/metas";
import { rotuloMesCurto } from "@/lib/financeiro/meses";
import { toast } from "@/lib/ui/toast";
import { formatarMoeda } from "@/lib/utils";
import type { Premissas } from "@/lib/metas/projecao";

/**
 * O que se mexe na tela de Metas.
 *
 * A Fran: "para a gente conseguir ficar sempre analisando essas
 * projeções". Analisar é mexer num número e ver o resto mudar, por
 * isso tudo salva ao sair do campo, sem botão no meio do caminho.
 *
 * O que NÃO se mexe aqui: carteira, faturamento e contas fixas. Cada
 * um tem a tela dele, e o mesmo número em dois lugares é como se
 * perde a conta.
 */

import type { FormaDePagamento } from "@/lib/metas/projecao";

export interface ContratacaoNaTela {
  id: string;
  cargo: string;
  forma: FormaDePagamento;
  custoMensal: number | null;
  valorPorUnidade: number | null;
  tetoDeUnidades: number | null;
  mesDeInicio: string;
  ativa: boolean;
  clt: boolean;
  nota: string | null;
}

/** Como escrever cada forma de pagamento na tela. */
export const COMO_PAGA: Record<FormaDePagamento, string> = {
  mensal: "por mês",
  por_video_editado: "por vídeo editado",
  por_video_gravado: "por vídeo gravado",
  por_cliente: "por cliente atendido",
  uma_vez: "uma vez só",
};

function emReais(v: number): string {
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function PainelDasMetas({
  premissas,
  contratacoes,
  ritmo,
  meses,
  podeSalvar,
}: {
  premissas: Premissas;
  contratacoes: ContratacaoNaTela[];
  ritmo: Record<string, number>;
  /** Os meses da projeção, em ordem. */
  meses: string[];
  /** false enquanto as tabelas não existirem no banco. */
  podeSalvar: boolean;
}) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();
  const [excluindo, setExcluindo] = useState<ContratacaoNaTela | null>(null);
  const [novoCargo, setNovoCargo] = useState("");
  const [novoMes, setNovoMes] = useState(meses[0] ?? "");

  const bloqueado = async () => ({
    ok: false,
    error: "Rode o ATUALIZAR.sql no Supabase para poder salvar.",
  });

  function alternar(c: ContratacaoNaTela, campo: "ativa" | "clt") {
    iniciar(async () => {
      const r = await salvarContratacaoAction(c.id, { [campo]: !c[campo] });
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível salvar.");
        return;
      }
      router.refresh();
    });
  }

  function criar() {
    iniciar(async () => {
      const r = await criarContratacaoAction(novoCargo, novoMes);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível criar.");
        return;
      }
      setNovoCargo("");
      toast.sucesso("Contratação criada. Falta o valor.");
      router.refresh();
    });
  }

  function excluir() {
    if (!excluindo) return;
    const alvo = excluindo;
    iniciar(async () => {
      const r = await excluirContratacaoAction(alvo.id);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível excluir.");
        return;
      }
      setExcluindo(null);
      toast.sucesso(`${alvo.cargo} saiu da projeção.`);
      router.refresh();
    });
  }

  const premissa = (campo: string) =>
    podeSalvar
      ? (v: string) => salvarPremissaAction(campo, v)
      : bloqueado;

  return (
    <>
      {/* ------------------------------------------------- ritmo */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900">
          Clientes novos em cada mês
        </h2>
        <p className="mb-3 text-xs text-gray-500">
          É o ritmo que a projeção inteira segue.
        </p>
        <div className="flex flex-wrap gap-3">
          {meses.map((m) => (
            <label key={m} className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                {rotuloMesCurto(m)}
              </span>
              <CampoSalvo
                valor={String(ritmo[m] ?? 0)}
                rotulo={`Clientes novos em ${rotuloMesCurto(m)}`}
                largura="w-16"
                alinhar="text-center"
                aoSalvar={
                  podeSalvar ? (v) => salvarRitmoAction(m, v) : bloqueado
                }
              />
            </label>
          ))}
        </div>
      </div>

      {/* ------------------------------------------ contratações */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <header className="border-b border-gray-200 px-4 py-2.5">
          <h2 className="text-sm font-bold text-gray-900">
            Quem entra na equipe
          </h2>
          <p className="text-xs text-gray-500">
            Desmarcar adia a contratação sem apagar os dados dela.
          </p>
        </header>

        <ul className="divide-y divide-gray-100">
          {contratacoes.map((c) => (
            <li
              key={c.id}
              className={
                "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 " +
                (c.ativa ? "" : "bg-gray-50")
              }
            >
              <input
                type="checkbox"
                checked={c.ativa}
                disabled={processando || !podeSalvar}
                onChange={() => alternar(c, "ativa")}
                aria-label={`Contar ${c.cargo} na projeção`}
                className="h-4 w-4 shrink-0 accent-area"
              />

              <span className="min-w-0 basis-full sm:flex-1 sm:basis-0">
                <span className="block text-sm font-semibold text-gray-900">
                  {c.cargo}
                </span>
                {c.nota ? (
                  <span className="block text-xs text-gray-500">{c.nota}</span>
                ) : null}
              </span>

              <span className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:ml-auto">
                <label className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">entra em</span>
                  <CampoSalvo
                    valor={c.mesDeInicio}
                    rotulo={`Mês em que ${c.cargo} entra`}
                    largura="w-24"
                    alinhar="text-center"
                    aoSalvar={
                      podeSalvar
                        ? (v) => salvarContratacaoAction(c.id, { mesDeInicio: v })
                        : bloqueado
                    }
                  />
                </label>

                {c.forma !== "mensal" && c.forma !== "uma_vez" ? (
                  <span className="text-sm text-gray-600">
                    {c.valorPorUnidade != null
                      ? `${formatarMoeda(c.valorPorUnidade)} ${COMO_PAGA[c.forma]}`
                      : COMO_PAGA[c.forma]}
                    {c.tetoDeUnidades != null
                      ? `, até ${c.tetoDeUnidades}`
                      : ""}
                  </span>
                ) : (
                  <>
                    <label className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">R$</span>
                      <CampoSalvo
                        valor={c.custoMensal == null ? "" : emReais(c.custoMensal)}
                        rotulo={`Salário de ${c.cargo}`}
                        aoSalvar={
                          podeSalvar
                            ? (v) =>
                                salvarContratacaoAction(c.id, { custoMensal: v })
                            : bloqueado
                        }
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={c.clt}
                        disabled={processando || !podeSalvar}
                        onChange={() => alternar(c, "clt")}
                        className="h-3.5 w-3.5 accent-area"
                      />
                      CLT
                    </label>
                  </>
                )}

                {(c.forma === "mensal" || c.forma === "uma_vez") &&
                c.custoMensal == null ? (
                  <span className="text-xs font-semibold text-alerta">
                    falta o valor
                  </span>
                ) : null}

                <button
                  type="button"
                  onClick={() => setExcluindo(c)}
                  disabled={!podeSalvar}
                  className="rounded px-1.5 py-0.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-alerta disabled:opacity-40"
                >
                  Tirar
                </button>
              </span>
            </li>
          ))}
        </ul>

        <footer className="flex flex-wrap items-center gap-2 border-t border-gray-200 bg-gray-50 px-4 py-2.5">
          <input
            type="text"
            value={novoCargo}
            onChange={(e) => setNovoCargo(e.target.value)}
            placeholder="Cargo"
            aria-label="Cargo da contratação nova"
            className="min-w-0 flex-1 basis-40 rounded-lg border border-gray-300 px-2 py-1 text-sm"
          />
          <input
            type="text"
            value={novoMes}
            onChange={(e) => setNovoMes(e.target.value)}
            placeholder="AAAA-MM"
            aria-label="Mês de início"
            className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-center text-sm tabular-nums"
          />
          <Button
            variante="secundaria"
            onClick={criar}
            disabled={processando || !podeSalvar || !novoCargo.trim()}
          >
            + Contratação
          </Button>
        </footer>
      </div>

      {/* ---------------------------------------------- premissas */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900">Premissas</h2>
        <p className="mb-3 text-xs text-gray-500">
          Mudar qualquer uma refaz a conta inteira.
        </p>
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Ticket do cliente novo", "ticket_novo", emReais(premissas.ticketNovo)],
            ["Vídeos por cliente novo", "videos_por_cliente", String(premissas.videosPorCliente)],
            ["Vídeos que o editor edita", "videos_do_editor", String(premissas.videosDoEditor)],
            ["Preço por vídeo ao editor", "preco_por_video", emReais(premissas.precoPorVideo)],
            ["Guardar por mês", "guardar_por_mes", emReais(premissas.guardarPorMes)],
            ["Meta guardada", "meta_guardada", emReais(premissas.metaGuardada)],
            ["Mês da meta", "mes_da_meta", premissas.mesDaMeta],
            ["Encargos CLT (%)", "encargos_clt", String(Math.round(premissas.encargosClt * 100))],
            ["Imposto por mês fora do MEI", "imposto_fixo", emReais(premissas.impostoFixo)],
            ["Contador por mês", "contador_mensal", emReais(premissas.contadorMensal)],
            ["DAS do MEI (sai do custo fixo)", "das_do_mei", emReais(premissas.dasDoMei)],
            ["Saída do MEI (uma vez)", "custo_saida_do_mei", emReais(premissas.custoSaidaDoMei)],
            ["Mês da saída do MEI", "mes_saida_do_mei", premissas.mesSaidaDoMei],
          ].map(([rotulo, campo, valor]) => (
            <label key={campo} className="flex items-center justify-between gap-3">
              <span className="min-w-0 text-sm text-gray-700">{rotulo}</span>
              <CampoSalvo
                valor={valor}
                rotulo={rotulo}
                aoSalvar={premissa(campo)}
              />
            </label>
          ))}
        </div>
        <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
          Clientes de hoje, faturamento recorrente e contas fixas não se
          editam aqui: vêm do Administrativo e do Financeiro.
        </p>
      </div>

      <ConfirmDialog
        aberto={excluindo !== null}
        titulo={excluindo ? `Tirar ${excluindo.cargo} da projeção?` : ""}
        descricao="Some da conta e da tabela. Para só adiar, desmarque a caixinha em vez de tirar."
        textoConfirmar="Tirar"
        varianteConfirmar="perigo"
        carregando={processando}
        aoConfirmar={excluir}
        aoCancelar={() => setExcluindo(null)}
      />
    </>
  );
}
