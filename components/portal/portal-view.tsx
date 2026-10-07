"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "@/lib/ui/toast";
import { enviarResultadoClienteAction } from "@/lib/actions/resultados";
import { marcarPlanoClienteAction } from "@/lib/actions/portal";
import { FONTES_CONTATO } from "@/types";
import {
  statusClientePost,
  type DadosPortal,
  type PortalGravacao,
  type PortalPost,
  type ResultadoPortal,
  type ResumoMes,
} from "@/lib/portal/tipos";

const NOMES_MES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];
const NOMES_DIA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** "2026-09-21" -> "seg, 21/set". */
function fmtDia(iso: string | null): string {
  if (!iso) return "";
  const [a, m, d] = iso.split("-").map(Number);
  if (!a || !m || !d) return "";
  const dt = new Date(a, m - 1, d);
  return `${NOMES_DIA[dt.getDay()]}, ${String(d).padStart(2, "0")}/${NOMES_MES[m - 1]}`;
}
function fmtIntervalo(ini: string, fim: string): string {
  const [, mi, di] = ini.split("-").map(Number);
  const [, mf, df] = fim.split("-").map(Number);
  return `${String(di).padStart(2, "0")}/${NOMES_MES[mi - 1]} a ${String(df).padStart(2, "0")}/${NOMES_MES[mf - 1]}`;
}

/** Chip colorido do formato (mesma linguagem visual do sistema). */
function chipFormato(format: string | null): string {
  const f = (format ?? "").toLowerCase();
  if (f.includes("reel") || f.includes("vídeo") || f.includes("video"))
    return "bg-rose-100 text-rose-700";
  if (f.includes("carrossel")) return "bg-blue-100 text-blue-700";
  if (f.includes("story")) return "bg-violet-100 text-violet-700";
  return "bg-gray-100 text-gray-600";
}

/** Cor do "pontinho" por formato (versão compacta/celular do calendário). */
function corDot(format: string | null): string {
  const f = (format ?? "").toLowerCase();
  if (f.includes("reel") || f.includes("vídeo") || f.includes("video"))
    return "bg-rose-400";
  if (f.includes("carrossel")) return "bg-blue-400";
  if (f.includes("story")) return "bg-violet-400";
  return "bg-gray-400";
}

/**
 * Calendário do mês com as postagens no dia certo. No celular fica compacto
 * (só pontinhos coloridos por postagem); no computador mostra o título em cada
 * dia. É uma visão SECUNDÁRIA — a semana vem primeiro.
 */
function CalendarioMes({ posts }: { posts: PortalPost[] }) {
  const comData = posts.filter((p) => p.data);
  if (comData.length === 0) return null;
  const [ano, mes] = (comData[0].data as string).split("-").map(Number);
  if (!ano || !mes) return null;

  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay(); // 0=Dom
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const porDia = new Map<number, PortalPost[]>();
  for (const p of comData) {
    const dia = Number((p.data as string).slice(8, 10));
    porDia.set(dia, [...(porDia.get(dia) ?? []), p]);
  }
  const celulas: (number | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i += 1) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d += 1) celulas.push(d);
  while (celulas.length % 7 !== 0) celulas.push(null);

  const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-2 shadow-sm">
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-gray-400">
        {DIAS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {celulas.map((d, i) => {
          const doDia = d ? (porDia.get(d) ?? []) : [];
          return (
            <div
              key={i}
              className={`min-h-[40px] rounded-lg p-1 sm:min-h-[58px] ${d ? "border border-gray-100" : ""}`}
            >
              {d ? (
                <p className="text-[10px] font-semibold text-gray-400">{d}</p>
              ) : null}
              {/* Computador: título em cada dia. */}
              <div className="mt-0.5 hidden space-y-0.5 sm:block">
                {doDia.slice(0, 3).map((p) => (
                  <p
                    key={p.id}
                    title={p.title}
                    className={`truncate rounded px-1 text-[9px] font-medium leading-tight ${chipFormato(p.format)}`}
                  >
                    {p.title}
                  </p>
                ))}
                {doDia.length > 3 ? (
                  <p className="text-[9px] text-gray-400">+{doDia.length - 3}</p>
                ) : null}
              </div>
              {/* Celular: só pontinhos coloridos (fica leve). */}
              {doDia.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                  {doDia.slice(0, 4).map((p) => (
                    <span
                      key={p.id}
                      className={`h-1.5 w-1.5 rounded-full ${corDot(p.format)}`}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CartaoPost({ post }: { post: PortalPost }) {
  const [aberto, setAberto] = useState(false);
  const st = statusClientePost(post.status, post.format);
  const temLegenda = !!post.caption?.trim();

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {post.format ? (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${chipFormato(post.format)}`}
          >
            {post.format}
          </span>
        ) : null}
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.tom}`}
        >
          {st.label}
        </span>
        {post.data ? (
          <span className="ml-auto text-xs font-medium text-gray-500">
            {fmtDia(post.data)}
          </span>
        ) : null}
      </div>

      <h3 className="mt-2 text-[15px] font-semibold leading-snug text-gray-900">
        {post.title}
      </h3>

      {temLegenda ? (
        <>
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="mt-2 text-xs font-semibold text-brand-700 hover:underline"
          >
            {aberto ? "Ocultar legenda" : "Ver legenda"}
          </button>
          {aberto ? (
            <div className="mt-2 border-t border-gray-100 pt-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Legenda
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {post.caption}
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Métricas que o dashboard sempre mostra (mesmo antes de começar o tráfego). */
const DASHBOARD_PADRAO = [
  "Investimento",
  "Pessoas alcançadas",
  "Impressões",
  "Visitas à página",
  "Conversas iniciadas",
];

/** Explicação curta de cada métrica (o cliente toca pra ver). */
const EXPLICACAO_METRICA: Record<string, string> = {
  Investimento: "Quanto foi investido nos anúncios nesta semana.",
  "Pessoas alcançadas": "Quantas pessoas diferentes viram os seus anúncios.",
  Impressões:
    "Quantas vezes os anúncios apareceram na tela (a mesma pessoa pode ver mais de uma vez).",
  "Visitas à página":
    "Quantas pessoas visitaram o seu perfil ou página vindas dos anúncios.",
  "Cliques no link": "Quantas pessoas clicaram no link do anúncio.",
  "Conversas iniciadas":
    "Quantas pessoas começaram uma conversa com você pelos anúncios.",
  Resultados: "Quantas das ações que definimos como objetivo aconteceram.",
  "Custo por resultado": "Quanto custou, em média, cada resultado.",
};

function ResultadoBloco({
  token,
  resultado,
}: {
  token: string;
  resultado: ResultadoPortal;
}) {
  const router = useRouter();
  const [closed, setClosed] = useState(
    resultado.closedCount != null ? String(resultado.closedCount) : "",
  );
  const [sources] = useState(resultado.sources ?? "");
  const [comment, setComment] = useState(resultado.comment ?? "");
  // Contatos por fonte (contagem) — jeito rápido de informar de onde vieram.
  const [fontes, setFontes] = useState<Record<string, number>>(() => ({
    ...resultado.sourcesBreakdown,
  }));
  const ajustarFonte = (fonte: string, delta: number) =>
    setFontes((f) => ({ ...f, [fonte]: Math.max(0, (f[fonte] ?? 0) + delta) }));
  const totalContatos = Object.values(fontes).reduce((a, b) => a + (b || 0), 0);
  const [enviando, iniciar] = useTransition();
  const [explicando, setExplicando] = useState<string | null>(null);
  // Formulário aberto por padrão só quando ainda não respondeu; depois vira
  // uma visão de dashboard com botão "Atualizar".
  const [editando, setEditando] = useState(!resultado.respondido);

  // O dashboard aparece SEMPRE: com os números quando a equipe sobe o relatório,
  // ou com as métricas em branco (—) antes do tráfego começar, pra já dar a cara
  // do painel. Os extras da planilha que não estão no padrão entram no fim.
  const semDados = resultado.metrics.length === 0;
  const metricasExibir = semDados
    ? DASHBOARD_PADRAO.map((label) => ({ label, value: "" }))
    : resultado.metrics;

  // Funil: conversas iniciadas (Meta) x quantos o cliente fechou.
  const conversao = (() => {
    const m = resultado.metrics.find((x) =>
      x.label.toLowerCase().includes("conversas"),
    );
    const conversas = m ? parseInt(m.value.replace(/[^\d]/g, ""), 10) : NaN;
    const fechou = resultado.closedCount;
    if (!Number.isFinite(conversas) || conversas <= 0 || fechou == null)
      return null;
    return {
      conversas,
      fechou,
      taxa: Math.round((fechou / conversas) * 100),
    };
  })();

  const enviar = () =>
    iniciar(async () => {
      const r = await enviarResultadoClienteAction(token, resultado.weekStart, {
        closedCount: closed,
        sources,
        comment,
        sourcesBreakdown: fontes,
      });
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível enviar.");
        return;
      }
      toast.sucesso("Enviado! Obrigada 💛");
      setEditando(false);
      router.refresh();
    });

  return (
    <Colapsavel titulo="Resultados da semana" emoji="📈">
      {/* Dashboard do tráfego pago — sempre visível */}
      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
            Tráfego pago (anúncios)
          </p>
          {semDados ? (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
              começa em breve
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {metricasExibir.map((m, i) => {
            const temExpl = !!EXPLICACAO_METRICA[m.label];
            const ativo = explicando === m.label;
            return (
              <button
                key={i}
                type="button"
                onClick={() =>
                  temExpl ? setExplicando(ativo ? null : m.label) : undefined
                }
                className={`relative rounded-xl bg-gradient-to-br from-brand-50 to-white p-3 text-center ring-1 transition-all ${ativo ? "ring-brand-400" : "ring-brand-100"}`}
              >
                {temExpl ? (
                  <span className="absolute right-1.5 top-1.5 text-[10px] text-brand-300">
                    ⓘ
                  </span>
                ) : null}
                <p className="text-lg font-extrabold leading-tight text-brand-800">
                  {m.value || "—"}
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase leading-tight tracking-wide text-gray-500">
                  {m.label}
                </p>
              </button>
            );
          })}
        </div>

        {/* Explicação da métrica tocada */}
        {explicando && EXPLICACAO_METRICA[explicando] ? (
          <div className="mt-2 rounded-xl bg-brand-50 px-3 py-2 text-[13px] leading-relaxed text-brand-800">
            <span className="font-semibold">{explicando}:</span>{" "}
            {EXPLICACAO_METRICA[explicando]}
          </div>
        ) : (
          <p className="mt-2 text-[11px] text-gray-400">
            Toque num número pra ver o que ele significa.
          </p>
        )}

        {conversao ? (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-brand-800 px-4 py-3 text-white">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-white/70">
                Conversas que viraram cliente
              </p>
              <p className="text-sm font-semibold">
                {conversao.conversas} conversas → {conversao.fechou}{" "}
                fechado{conversao.fechou === 1 ? "" : "s"}
              </p>
            </div>
            <p className="text-2xl font-extrabold">{conversao.taxa}%</p>
          </div>
        ) : null}

        {resultado.teamNote?.trim() ? (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {resultado.teamNote}
          </p>
        ) : null}

        {semDados ? (
          <p className="mt-3 text-xs text-gray-500">
            Os números aparecem aqui toda semana, assim que a campanha começar.
          </p>
        ) : null}
      </div>

      {/* Seus resultados — entram no dashboard e viram relatório */}
      <div className="mt-3 rounded-2xl border border-brand-200 bg-brand-50/50 p-4">
        <p className="text-sm font-semibold text-brand-800">
          Seus resultados desta semana 💬
        </p>
        <p className="mt-0.5 text-xs text-gray-600">
          Quantos viraram cliente e de onde vieram. Isso completa o dashboard.
        </p>

        {resultado.respondido && !editando ? (
          <>
            {/* Visão dashboard da resposta do cliente */}
            {(() => {
              const entradas = Object.entries(resultado.sourcesBreakdown).filter(
                ([, v]) => v > 0,
              );
              const totContatos = entradas.reduce((a, [, v]) => a + v, 0);
              return (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-white p-3 text-center ring-1 ring-brand-100">
                      <p className="text-lg font-extrabold leading-tight text-brand-800">
                        {totContatos || "—"}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium uppercase leading-tight tracking-wide text-gray-500">
                        Contatos
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-3 text-center ring-1 ring-brand-100">
                      <p className="text-lg font-extrabold leading-tight text-brand-800">
                        {resultado.closedCount ?? "—"}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium uppercase leading-tight tracking-wide text-gray-500">
                        Fecharam
                      </p>
                    </div>
                  </div>
                  {entradas.length > 0 ? (
                    <div className="mt-2 rounded-xl bg-white p-3 ring-1 ring-brand-100">
                      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                        De onde vieram
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {entradas.map(([fonte, qtd]) => (
                          <span
                            key={fonte}
                            className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800 ring-1 ring-brand-100"
                          >
                            {fonte} <strong>{qtd}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              );
            })()}
            {resultado.comment?.trim() ? (
              <p className="mt-2 whitespace-pre-wrap rounded-xl bg-white px-3 py-2 text-sm italic text-gray-600 ring-1 ring-brand-100">
                “{resultado.comment}”
              </p>
            ) : null}
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
              >
                Atualizar
              </button>
              <span className="text-xs text-green-700">
                ✓ já recebemos, obrigada!
              </span>
            </div>
          </>
        ) : (
          <>
            <label className="mt-3 block text-xs font-medium text-gray-600">
              De onde vieram os contatos?{" "}
              <span className="text-gray-400">(toque no + pra contar)</span>
            </label>
            <div className="mt-1.5 space-y-1.5">
              {FONTES_CONTATO.map((fonte) => {
                const qtd = fontes[fonte] ?? 0;
                return (
                  <div
                    key={fonte}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-1.5"
                  >
                    <span className="text-sm text-gray-700">{fonte}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => ajustarFonte(fonte, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
                        aria-label={`Menos ${fonte}`}
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-brand-800">
                        {qtd}
                      </span>
                      <button
                        type="button"
                        onClick={() => ajustarFonte(fonte, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100"
                        aria-label={`Mais ${fonte}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              Total de contatos: <strong>{totalContatos}</strong>
            </p>

            <label className="mt-3 block text-xs font-medium text-gray-600">
              Desses, quantos viraram cliente?{" "}
              <span className="text-gray-400">
                (consulta, agendamento ou fechamento)
              </span>
            </label>
            <input
              inputMode="numeric"
              value={closed}
              onChange={(e) => setClosed(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Ex.: 5"
              className="mt-1 w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />

            <label className="mt-3 block text-xs font-medium text-gray-600">
              Comentário (opcional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Como foi o mês? O que funcionou, o que podemos melhorar…"
              className="mt-1 w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand-500"
            />

            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={enviar}
                disabled={enviando}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {enviando
                  ? "Enviando…"
                  : resultado.respondido
                    ? "Salvar"
                    : "Enviar"}
              </button>
              {resultado.respondido ? (
                <button
                  type="button"
                  onClick={() => setEditando(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  cancelar
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </Colapsavel>
  );
}

function ResumoMesCard({ resumo }: { resumo: ResumoMes }) {
  const [aberto, setAberto] = useState(false);
  const total = resumo.meta ?? resumo.planejados;

  const Tile = ({ n, rotulo }: { n: number | string; rotulo: string }) => (
    <div className="flex-1 rounded-xl bg-white/70 px-3 py-2 text-center">
      <p className="text-xl font-bold text-brand-800">{n}</p>
      <p className="text-[11px] uppercase tracking-wide text-gray-500">
        {rotulo}
      </p>
    </div>
  );

  return (
    <Colapsavel titulo={resumo.label} emoji="📊">
    <div className="rounded-2xl border border-black/5 bg-brand-50 p-4 shadow-sm">
      <div className="flex gap-2">
        <Tile n={`${resumo.publicados}/${total}`} rotulo="Publicados" />
        <Tile n={resumo.restantes} rotulo="A publicar" />
        <Tile n={resumo.planejados} rotulo="Planejados" />
      </div>
      {resumo.jaFeitos.length > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="mt-3 text-xs font-semibold text-brand-700 hover:underline"
          >
            {aberto
              ? "Ocultar o que já foi ao ar"
              : `Ver o que já foi ao ar (${resumo.jaFeitos.length})`}
          </button>
          {aberto ? (
            <ul className="mt-2 space-y-1.5 border-t border-brand-200 pt-2">
              {resumo.jaFeitos.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <span className="text-green-600">✓</span>
                  <span className="min-w-0 flex-1 truncate">{p.title}</span>
                  {p.data ? (
                    <span className="shrink-0 text-xs text-gray-400">
                      {fmtDia(p.data)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
    </Colapsavel>
  );
}

function CartaoGravacao({ grav }: { grav: PortalGravacao }) {
  const [aberto, setAberto] = useState(false);
  const r = grav.roteiro;
  const temRoteiro = !!r && (r.linhas.length > 0 || r.paragrafos.length > 0);

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {grav.format ? (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${chipFormato(grav.format)}`}
          >
            {grav.format}
          </span>
        ) : null}
        <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700">
          🎥 Gravação
        </span>
        {grav.situacao === "gravado" ? (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
            ✓ Já gravado
          </span>
        ) : grav.situacao === "a_agendar" ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
            A agendar
          </span>
        ) : grav.situacao === "a_remarcar" ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
            A remarcar
          </span>
        ) : (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
            Agendado
          </span>
        )}
        <span className="ml-auto text-xs font-medium text-gray-500">
          {grav.situacao === "a_remarcar" || grav.situacao === "a_agendar"
            ? "data a combinar"
            : `${fmtDia(grav.data)}${grav.hora ? ` · ${grav.hora}` : ""}`}
        </span>
      </div>

      <h3 className="mt-2 text-[15px] font-semibold leading-snug text-gray-900">
        {grav.title}
      </h3>
      {grav.local ? (
        <p className="mt-0.5 text-xs text-gray-500">📍 {grav.local}</p>
      ) : null}

      {temRoteiro ? (
        <>
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="mt-2 text-xs font-semibold text-brand-700 hover:underline"
          >
            {aberto ? "Ocultar roteiro" : "Ver roteiro"}
          </button>
          {aberto ? (
            <div className="mt-2 border-t border-gray-100 pt-3">
              {r!.linhas.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="w-full table-fixed border-collapse text-left text-sm">
                    <thead>
                      <tr className="bg-brand-50 text-[11px] font-bold uppercase tracking-wider text-brand-700">
                        <th className="w-1/2 border-r border-brand-100 px-3 py-2">
                          {r!.colEsq}
                        </th>
                        <th className="w-1/2 px-3 py-2">{r!.colDir}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r!.linhas.map((linha, i) => (
                        <tr
                          key={i}
                          className="border-t border-gray-100 align-top"
                        >
                          <td className="whitespace-pre-wrap break-words border-r border-gray-100 px-3 py-2 leading-relaxed text-gray-900">
                            {linha.esq || "·"}
                          </td>
                          <td className="whitespace-pre-wrap break-words px-3 py-2 italic leading-relaxed text-gray-500">
                            {linha.dir || "·"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-2">
                  {r!.paragrafos.map((p, i) => (
                    <p
                      key={i}
                      className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Seção recolhível: toque no título pra minimizar/abrir. */
function Colapsavel({
  titulo,
  emoji,
  cor = "text-brand-800",
  defaultAberto = false,
  badge,
  children,
}: {
  titulo: string;
  emoji: string;
  cor?: string;
  defaultAberto?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(defaultAberto);
  return (
    <section className="mt-6">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className={`mb-2 flex w-full items-center gap-2 text-sm font-bold uppercase tracking-wide ${cor}`}
      >
        <span aria-hidden>{emoji}</span>
        <span className="flex-1 text-left">{titulo}</span>
        {badge}
        <span
          aria-hidden
          className={`text-base text-gray-400 transition-transform ${aberto ? "" : "-rotate-90"}`}
        >
          ⌄
        </span>
      </button>
      {aberto ? children : null}
    </section>
  );
}

function Secao({
  titulo,
  emoji,
  vazio,
  children,
}: {
  titulo: string;
  emoji: string;
  vazio?: string;
  children: React.ReactNode;
}) {
  return (
    <Colapsavel titulo={titulo} emoji={emoji}>
      {vazio ? (
        <p className="rounded-xl border border-dashed border-brand-200 bg-white/60 px-4 py-3 text-sm text-gray-400">
          {vazio}
        </p>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </Colapsavel>
  );
}

export function PortalView({
  token,
  dados,
  hrefSemana,
}: {
  token: string;
  dados: DadosPortal;
  hrefSemana: { anterior: string; proximo: string; hoje: string };
}) {
  const {
    cliente,
    resumoMes,
    resultado,
    postsSemana,
    postsMes,
    gravacoesSemana,
    emProducao,
    pausadosCancelados,
    planoAcao,
  } = dados;

  // Plano de ação SINTETIZADO pro painel: em vez de despejar a lista inteira,
  // mostramos o que a FAVIE está fazendo, resumido em "em andamento", "próximos"
  // e quantos já foram concluídos, com uma barra de progresso. O que depende do
  // cliente vai pro bloco destacado "O que precisamos de você".
  const planoFavie = planoAcao.filter((e) => e.owner !== "Cliente");
  const porData = (a: (typeof planoAcao)[number], b: (typeof planoAcao)[number]) =>
    (a.dateLabel ? 0 : 1) - (b.dateLabel ? 0 : 1);
  const planoFeitos = planoFavie.filter((e) => e.status === "Feita");
  const planoAndamento = planoFavie.filter((e) => e.status === "Fazendo");
  const planoProximos = planoFavie
    .filter((e) => e.status !== "Feita" && e.status !== "Fazendo")
    .sort(porData);
  const planoPct =
    planoFavie.length > 0
      ? Math.round((planoFeitos.length / planoFavie.length) * 100)
      : 0;
  // O que precisamos do cliente: TODOS os itens do cliente (feitos e a fazer),
  // pra ele poder dar check no que já resolveu. Check otimista + salva por token.
  const [feitoCliente, setFeitoCliente] = useState<Record<string, boolean>>({});
  const [, iniciarCheck] = useTransition();
  const estaFeito = (e: (typeof planoAcao)[number]) =>
    feitoCliente[e.id] ?? e.status === "Feita";
  const alternarCliente = (e: (typeof planoAcao)[number]) => {
    const novo = !estaFeito(e);
    setFeitoCliente((m) => ({ ...m, [e.id]: novo }));
    iniciarCheck(async () => {
      const r = await marcarPlanoClienteAction(token, e.id, novo);
      if (!r.ok) {
        setFeitoCliente((m) => ({ ...m, [e.id]: !novo })); // desfaz
        toast.erro(r.error ?? "Não foi possível salvar.");
      }
    });
  };
  const [verFeitosCliente, setVerFeitosCliente] = useState(false);
  const itensCliente = planoAcao.filter((e) => e.owner === "Cliente");
  const clientePendentes = itensCliente.filter((e) => !estaFeito(e));
  const clienteFeitos = itensCliente.filter((e) => estaFeito(e));
  const precisamosVoce = itensCliente; // usado só pra decidir se mostra a seção

  const LinhaCliente = ({ e }: { e: (typeof planoAcao)[number] }) => {
    const feito = estaFeito(e);
    return (
      <li>
        <button
          type="button"
          onClick={() => alternarCliente(e)}
          className="flex w-full items-start gap-2.5 rounded-lg p-1.5 text-left hover:bg-amber-100/60"
        >
          <span
            aria-hidden
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] text-white transition-colors ${feito ? "border-green-600 bg-green-600" : "border-amber-400 bg-white"}`}
          >
            {feito ? "✓" : ""}
          </span>
          <span className="text-sm">
            <span
              className={`font-semibold ${feito ? "text-amber-900/50 line-through" : "text-amber-900"}`}
            >
              {e.title}
            </span>
            {e.dateLabel ? (
              <span className={feito ? "text-amber-700/50" : "text-amber-700"}>
                {" "}
                · {e.dateLabel}
              </span>
            ) : null}
            {e.description && !feito ? (
              <span className="block text-[13px] font-normal text-amber-800/80">
                {e.description}
              </span>
            ) : null}
          </span>
        </button>
      </li>
    );
  };

  return (
    <main className="min-h-screen bg-[#fff7ea] pb-16">
      {/* Cabeçalho */}
      <header className="bg-brand-800 px-5 pb-6 pt-7 text-white">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
            favie · acompanhamento
          </p>
          <h1 className="mt-1 text-2xl font-bold">{cliente.name}</h1>
          <p className="mt-1 text-sm text-white/80">
            Acompanhe de perto tudo que está sendo feito pela sua marca.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5">
        {/* Navegação de semana */}
        <div className="-mt-4 flex items-center justify-between gap-2 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm">
          <Link
            href={hrefSemana.anterior}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            ←
          </Link>
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-wide text-gray-400">
              Semana
            </p>
            <p className="text-sm font-bold text-gray-900">
              {fmtIntervalo(dados.iniISO, dados.fimISO)}
            </p>
          </div>
          <Link
            href={hrefSemana.proximo}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            →
          </Link>
        </div>

        {/* O que precisamos de você (itens do cliente — pode dar check) */}
        {precisamosVoce.length > 0 ? (
          <Colapsavel
            titulo="O que precisamos de você"
            emoji="🙌"
            cor="text-amber-800"
            badge={
              (() => {
                const pend = precisamosVoce.filter((e) => !estaFeito(e)).length;
                return pend > 0 ? (
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                    {pend} a fazer
                  </span>
                ) : (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
                    tudo ok
                  </span>
                );
              })()
            }
          >
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              {/* A fazer */}
              {clientePendentes.length > 0 ? (
                <>
                  <p className="mb-2 text-[11px] text-amber-700">
                    Toque no círculo pra marcar o que você já resolveu.
                  </p>
                  <ul className="space-y-1.5">
                    {clientePendentes.map((e) => (
                      <LinhaCliente key={e.id} e={e} />
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm font-medium text-green-700">
                  ✓ Tudo resolvido por aqui, obrigada!
                </p>
              )}

              {/* Já feito (recolhível) */}
              {clienteFeitos.length > 0 ? (
                <div className="mt-3 border-t border-amber-200 pt-2">
                  <button
                    type="button"
                    onClick={() => setVerFeitosCliente((v) => !v)}
                    className="flex w-full items-center gap-1.5 text-xs font-semibold text-amber-700"
                  >
                    <span aria-hidden className={verFeitosCliente ? "" : "-rotate-90"}>
                      ⌄
                    </span>
                    ✓ Já feito ({clienteFeitos.length})
                  </button>
                  {verFeitosCliente ? (
                    <ul className="mt-1.5 space-y-1.5">
                      {clienteFeitos.map((e) => (
                        <LinhaCliente key={e.id} e={e} />
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Colapsavel>
        ) : null}

        {planoFavie.length > 0 ? (
          <Colapsavel titulo="Plano de ação" emoji="🎯">
            {/* Progresso do mês */}
            <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-gray-800">
                  Andamento do mês
                </span>
                <span className="text-sm font-bold text-brand-700">
                  {planoFeitos.length}/{planoFavie.length} concluídos
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${planoPct}%` }}
                />
              </div>
            </div>

            {/* Em andamento agora */}
            {planoAndamento.length > 0 ? (
              <div className="mt-3">
                <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-amber-700">
                  Em andamento agora
                </h3>
                <div className="space-y-2">
                  {planoAndamento.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {e.dateLabel ? (
                          <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600">
                            {e.dateLabel}
                          </span>
                        ) : null}
                        <span className="text-sm font-semibold text-gray-900">
                          {e.title}
                        </span>
                      </div>
                      {e.description ? (
                        <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-gray-600">
                          {e.description}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Próximos passos */}
            {planoProximos.length > 0 ? (
              <div className="mt-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-700">
                  Próximos passos
                </h3>
                <ul className="space-y-2">
                  {planoProximos.slice(0, 6).map((e) => (
                    <li key={e.id} className="flex items-start gap-2 text-sm">
                      <span aria-hidden className="mt-0.5 text-gray-300">
                        ○
                      </span>
                      <span className="text-gray-800">
                        {e.title}
                        {e.dateLabel ? (
                          <span className="text-gray-400"> · {e.dateLabel}</span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
                {planoProximos.length > 6 ? (
                  <p className="mt-2 text-[11px] text-gray-400">
                    +{planoProximos.length - 6} outros no plano
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* Já concluído: aparece a LISTA do que já foi entregue (prova de
                trabalho que o cliente quer ver), não só a contagem. */}
            {planoFeitos.length > 0 ? (
              <div className="mt-3 rounded-2xl border border-green-200 bg-green-50/60 p-4 shadow-sm">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-green-700">
                  ✓ Já feito ({planoFeitos.length})
                </h3>
                <ul className="space-y-2">
                  {planoFeitos.map((e) => (
                    <li key={e.id} className="flex items-start gap-2 text-sm">
                      <span
                        aria-hidden
                        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-600 text-[10px] text-white"
                      >
                        ✓
                      </span>
                      <span className="text-gray-800">
                        {e.title}
                        {e.dateLabel ? (
                          <span className="text-gray-400"> · {e.dateLabel}</span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Colapsavel>
        ) : null}

        <ResumoMesCard resumo={resumoMes} />

        <Colapsavel
          titulo="Postagens"
          emoji="📅"
          badge={
            postsMes.length > 0 ? (
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                {postsMes.length}
              </span>
            ) : undefined
          }
        >
          {/* A SEMANA VEM PRIMEIRO: é o que o cliente mais quer ver. */}
          {postsSemana.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Essa semana
              </p>
              {postsSemana.map((p) => (
                <CartaoPost key={p.id} post={p} />
              ))}
            </div>
          ) : null}
          {/* O mês inteiro vem depois, como visão de contexto. */}
          {postsMes.length > 0 ? (
            <div className={postsSemana.length > 0 ? "mt-4" : ""}>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                No mês
              </p>
              <CalendarioMes posts={postsMes} />
            </div>
          ) : null}
          {postsSemana.length === 0 && postsMes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-brand-200 bg-white/60 px-4 py-3 text-sm text-gray-400">
              Nenhuma postagem programada ainda.
            </p>
          ) : null}
        </Colapsavel>

        {gravacoesSemana.length > 0 ? (
          <Secao titulo="Produções a fazer" emoji="🎥">
            {gravacoesSemana.map((g) => (
              <CartaoGravacao key={g.id} grav={g} />
            ))}
          </Secao>
        ) : null}

        <Secao
          titulo="Em edição"
          emoji="🎬"
          vazio={
            emProducao.length === 0
              ? "Nada em edição no momento."
              : undefined
          }
        >
          {emProducao.map((p) => (
            <CartaoPost key={p.id} post={p} />
          ))}
        </Secao>

        {pausadosCancelados.length > 0 ? (
          <Secao titulo="Pausados ou cancelados" emoji="⏸️">
            {pausadosCancelados.map((p) => (
              <CartaoPost key={p.id} post={p} />
            ))}
          </Secao>
        ) : null}

        {/* "O que estamos fazendo" (demandas) foi removido: duplicava o que o
            Plano de ação já mostra em "Em andamento". */}

        <ResultadoBloco token={token} resultado={resultado} />

        <p className="mt-10 text-center text-xs text-gray-400">
          Feito com carinho pela favie 💛
        </p>
      </div>
    </main>
  );
}
