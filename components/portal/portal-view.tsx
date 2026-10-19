"use client";

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
/** "2026-10-12" + 6 dias -> "2026-10-18". */
function somaDias(iso: string, n: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const dt = new Date(a, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/**
 * Rótulo de data do item do plano. Se o item JÁ FOI FEITO, tira o "a confirmar"
 * (e variações): não faz sentido um item concluído ainda dizer que a data está
 * por confirmar. Se só sobrava isso, não mostra nada.
 */
function rotuloData(dateLabel: string | null, feito: boolean): string | null {
  if (!dateLabel) return null;
  if (!feito) return dateLabel;
  const limpo = dateLabel
    .replace(/\s*[-–·]?\s*a\s+(confirmar|definir|combinar|marcar)\b\.?\s*$/i, "")
    .trim();
  return limpo || null;
}

// --------------------------------------------------------------------------
// Ícones de linha (discretos, profissionais — no lugar de emojis). Herdam a
// cor do texto do cabeçalho (currentColor).
// --------------------------------------------------------------------------
const SVG = "h-[18px] w-[18px] shrink-0";
function IcoAcao() {
  return (
    <svg className={SVG} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4.5" y="4.5" width="15" height="16" rx="2.5" />
      <rect x="8.5" y="2.5" width="7" height="4" rx="1.5" />
      <path d="M8.7 12.4l2.3 2.3 4.3-4.6" />
    </svg>
  );
}
function IcoPosts() {
  return (
    <svg className={SVG} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  );
}
function IcoProximos() {
  return (
    <svg className={SVG} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="6.5" width="13" height="11" rx="2.5" />
      <path d="M15.5 10.2l5.5-3.2v10l-5.5-3.2z" />
    </svg>
  );
}
function IcoPlano() {
  return (
    <svg className={SVG} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IcoResultados() {
  return (
    <svg className={SVG} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4v16h16" />
      <path d="M7.5 14.5l3.5-4 3 2.8 4.5-6" />
    </svg>
  );
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
 * dia. Clicar numa postagem (ou num dia, no celular) abre uma janelinha com
 * TUDO sobre ela.
 */
function CalendarioMes({ posts }: { posts: PortalPost[] }) {
  const [detalhe, setDetalhe] = useState<PortalPost[] | null>(null);

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
              <div className="mt-0.5 hidden space-y-0.5 sm:block">
                {doDia.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    title={p.title}
                    onClick={() => setDetalhe([p])}
                    className={`block w-full truncate rounded px-1 text-left text-[9px] font-medium leading-tight transition-opacity hover:opacity-80 ${chipFormato(p.format)}`}
                  >
                    {p.title}
                  </button>
                ))}
                {doDia.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => setDetalhe(doDia)}
                    className="text-[9px] text-gray-400 hover:text-gray-600"
                  >
                    +{doDia.length - 3}
                  </button>
                ) : null}
              </div>
              {doDia.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setDetalhe(doDia)}
                  className="mt-1 flex w-full flex-wrap gap-0.5 sm:hidden"
                  aria-label={`Ver postagens do dia ${d}`}
                >
                  {doDia.slice(0, 4).map((p) => (
                    <span
                      key={p.id}
                      className={`h-1.5 w-1.5 rounded-full ${corDot(p.format)}`}
                    />
                  ))}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {detalhe ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={() => setDetalhe(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-brand-50 p-4 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">
                {detalhe.length === 1
                  ? fmtDia(detalhe[0].data)
                  : `${detalhe.length} postagens`}
              </h3>
              <button
                type="button"
                onClick={() => setDetalhe(null)}
                className="rounded-full px-2 py-1 text-gray-400 hover:bg-black/5"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {detalhe.map((p) => (
                <CartaoPost key={p.id} post={p} expandida />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CartaoPost({
  post,
  expandida = false,
}: {
  post: PortalPost;
  expandida?: boolean;
}) {
  const [aberto, setAberto] = useState(expandida);
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

      {expandida && post.resumo ? (
        <div className="mt-2 rounded-xl border border-brand-100 bg-brand-50/50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">
            Resumo
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {post.resumo}
          </p>
        </div>
      ) : null}

      {temLegenda ? (
        <>
          {expandida ? null : (
            <button
              type="button"
              onClick={() => setAberto((v) => !v)}
              className="mt-2 text-xs font-semibold text-brand-700 hover:underline"
            >
              {aberto ? "Ocultar legenda" : "Ver legenda"}
            </button>
          )}
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
      ) : expandida ? (
        <p className="mt-2 border-t border-gray-100 pt-3 text-sm text-gray-400">
          Legenda ainda não cadastrada.
        </p>
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

/** Linha com campo de NÚMERO (digita a quantidade — nada de ficar apertando +). */
function LinhaNumero({
  rotulo,
  sub,
  valor,
  onChange,
}: {
  rotulo: string;
  sub?: string;
  valor: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <span className="min-w-0 text-sm text-gray-700">
        {rotulo}
        {sub ? (
          <span className="block text-[11px] font-semibold text-brand-600">
            {sub}
          </span>
        ) : null}
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={valor ? String(valor) : ""}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          onChange(Number.isFinite(n) && n >= 0 ? n : 0);
        }}
        placeholder="0"
        className="w-20 shrink-0 rounded-lg border border-gray-300 px-2 py-1.5 text-right text-sm font-semibold text-gray-800 outline-none focus:border-brand-500"
      />
    </div>
  );
}

function ResultadoBloco({
  token,
  resultado,
  planilhaUrl,
}: {
  token: string;
  resultado: ResultadoPortal;
  planilhaUrl: string | null;
}) {
  const router = useRouter();
  const [closedTrafego, setClosedTrafego] = useState(resultado.closedTraffic ?? 0);
  const [closedOrganico, setClosedOrganico] = useState(resultado.closedOrganic ?? 0);
  const totalFechou = closedTrafego + closedOrganico;
  const [sources] = useState(resultado.sources ?? "");
  const [comment, setComment] = useState(resultado.comment ?? "");
  const [fontes, setFontes] = useState<Record<string, number>>(() => ({
    ...resultado.sourcesBreakdown,
  }));
  const totalContatos = Object.values(fontes).reduce((a, b) => a + (b || 0), 0);
  const [enviando, iniciar] = useTransition();
  const [explicando, setExplicando] = useState<string | null>(null);
  const [editando, setEditando] = useState(!resultado.respondido);

  const semDados = resultado.metrics.length === 0;
  const metricasExibir = semDados
    ? DASHBOARD_PADRAO.map((label) => ({ label, value: "" }))
    : resultado.metrics;

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
        closedTraffic: String(closedTrafego),
        closedOrganic: String(closedOrganico),
        sources,
        comment,
        sourcesBreakdown: fontes,
      });
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível enviar.");
        return;
      }
      toast.sucesso("Enviado! Obrigada.");
      setEditando(false);
      router.refresh();
    });

  return (
    <Colapsavel
      titulo="Resultados da semana"
      icone={<IcoResultados />}
      badge={
        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-700">
          {fmtIntervalo(resultado.weekStart, somaDias(resultado.weekStart, 6))}
        </span>
      }
    >
      {/* Tráfego pago — "atualiza a favie" (o cliente só vê) */}
      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
            Tráfego pago (anúncios)
          </p>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
            {semDados ? "começa em breve" : "atualiza a favie"}
          </span>
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
                  {m.value || "·"}
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase leading-tight tracking-wide text-gray-500">
                  {m.label}
                </p>
              </button>
            );
          })}
        </div>

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

      {/* Origem dos contatos + retorno — "você preenche" (o cliente) */}
      <div className="mt-3 rounded-2xl border border-brand-200 bg-brand-50/50 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-brand-800">
            Seus resultados desta semana
          </p>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            você preenche
          </span>
        </div>
        <p className="mt-0.5 text-xs text-gray-600">
          Quantos viraram cliente e de onde vieram. Isso completa o painel.
        </p>

        {resultado.respondido && !editando ? (
          <>
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
                        {totContatos || "·"}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium uppercase leading-tight tracking-wide text-gray-500">
                        Contatos
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-3 text-center ring-1 ring-brand-100">
                      <p className="text-lg font-extrabold leading-tight text-brand-800">
                        {resultado.closedCount ?? "·"}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium uppercase leading-tight tracking-wide text-gray-500">
                        Viraram cliente
                      </p>
                    </div>
                  </div>
                  {resultado.closedTraffic != null ||
                  resultado.closedOrganic != null ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">
                        Do anúncio: {resultado.closedTraffic ?? 0}
                      </span>
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700 ring-1 ring-brand-100">
                        Orgânico: {resultado.closedOrganic ?? 0}
                      </span>
                    </div>
                  ) : null}
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
              <span className="text-gray-400">(digite a quantidade)</span>
            </label>
            <div className="mt-1.5 space-y-1.5">
              {FONTES_CONTATO.map((fonte) => (
                <LinhaNumero
                  key={fonte}
                  rotulo={rotuloFonte(fonte)}
                  sub={
                    fonte === "Anúncio"
                      ? "↑ resultado do tráfego pago"
                      : undefined
                  }
                  valor={fontes[fonte] ?? 0}
                  onChange={(v) => setFontes((f) => ({ ...f, [fonte]: v }))}
                />
              ))}
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              Total de contatos: <strong>{totalContatos}</strong>
            </p>

            <div className="mt-3 rounded-xl border border-brand-100 bg-white p-3">
              <p className="text-xs font-semibold text-gray-700">
                Desses, quantos viraram cliente?
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">
                Quem de fato virou aluno/cliente (agendou, fez aula experimental
                ou fechou). Separe por origem pra medir o retorno do anúncio.
              </p>
              <div className="mt-2 space-y-1.5">
                <LinhaNumero
                  rotulo="Pelo anúncio (tráfego)"
                  valor={closedTrafego}
                  onChange={setClosedTrafego}
                />
                <LinhaNumero
                  rotulo="Orgânico (perfil, indicação…)"
                  valor={closedOrganico}
                  onChange={setClosedOrganico}
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Total que viraram cliente: <strong>{totalFechou}</strong>
              </p>
            </div>

            <label className="mt-3 block text-xs font-medium text-gray-600">
              Um recado da semana? (opcional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Como foi a semana? O que funcionou, o que podemos melhorar…"
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

      {/* Planilha detalhada (Google Sheets) — pro cliente que quer ver mais. */}
      {planilhaUrl ? (
        <a
          href={planilhaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <path d="M4 9h16M4 15h16M10 3v18" />
          </svg>
          Abrir planilha de resultados
        </a>
      ) : null}
    </Colapsavel>
  );
}

/** Rótulo claro de cada fonte de contato pro cliente entender. */
function rotuloFonte(fonte: string): string {
  if (fonte === "Anúncio") return "Anúncio (Facebook/Instagram)";
  if (fonte === "Instagram") return "Instagram (direct)";
  return fonte;
}

/** Seção "Seus posts": junta o resumo do mês, a semana e o calendário do mês. */
function SecaoPosts({
  ini,
  fim,
  resumo,
  postsSemana,
  postsMes,
}: {
  ini: string;
  fim: string;
  resumo: ResumoMes;
  postsSemana: PortalPost[];
  postsMes: PortalPost[];
}) {
  const [aba, setAba] = useState<"sem" | "mes">("sem");
  const total = resumo.planejados;
  const pct = total ? Math.round((resumo.publicados / total) * 100) : 0;

  return (
    <Colapsavel
      titulo="Seus posts"
      icone={<IcoPosts />}
      defaultAberto
      badge={
        total > 0 ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
            {resumo.publicados} de {total} no ar
          </span>
        ) : undefined
      }
    >
      {/* Progresso do mês (volume que não some ao avançar a semana) */}
      <div className="rounded-2xl border border-black/5 bg-brand-50 p-4 shadow-sm">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-brand-700">
            {resumo.label}
          </span>
          <span className="text-sm font-bold text-brand-800">
            {resumo.publicados} de {total} publicados
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/70">
          <div
            className="h-full rounded-full bg-green-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {resumo.restantes > 0 ? (
          <p className="mt-1.5 text-xs text-gray-500">
            Faltam {resumo.restantes} pra publicar este mês.
          </p>
        ) : null}
      </div>

      {/* Alternador semana / mês */}
      <div className="mt-3 flex gap-1.5 rounded-xl bg-brand-100/60 p-1">
        <button
          type="button"
          onClick={() => setAba("sem")}
          className={`flex-1 rounded-lg px-3 py-1.5 text-[13px] font-bold transition-colors ${aba === "sem" ? "bg-white text-brand-700 shadow-sm" : "text-gray-500"}`}
        >
          Esta semana
        </button>
        <button
          type="button"
          onClick={() => setAba("mes")}
          className={`flex-1 rounded-lg px-3 py-1.5 text-[13px] font-bold transition-colors ${aba === "mes" ? "bg-white text-brand-700 shadow-sm" : "text-gray-500"}`}
        >
          Mês todo
        </button>
      </div>

      {aba === "sem" ? (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
            {fmtIntervalo(ini, fim)}
          </p>
          {postsSemana.length > 0 ? (
            postsSemana.map((p) => <CartaoPost key={p.id} post={p} />)
          ) : (
            <p className="rounded-xl border border-dashed border-brand-200 bg-white/60 px-4 py-3 text-sm text-gray-400">
              Nada programado para esta semana.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-3">
          {postsMes.length > 0 ? (
            <CalendarioMes posts={postsMes} />
          ) : (
            <p className="rounded-xl border border-dashed border-brand-200 bg-white/60 px-4 py-3 text-sm text-gray-400">
              Nenhuma postagem no mês ainda.
            </p>
          )}
          {resumo.jaFeitos.length > 0 ? (
            <div className="mt-3 rounded-2xl border border-green-200 bg-green-50/60 p-4">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-green-700">
                Já publicado este mês
              </p>
              <ul className="space-y-1.5">
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
            </div>
          ) : null}
        </div>
      )}
    </Colapsavel>
  );
}

function CartaoGravacao({ grav }: { grav: PortalGravacao }) {
  const [aberto, setAberto] = useState(false);
  const [verOrientacoes, setVerOrientacoes] = useState(false);
  const r = grav.roteiro;
  const temRoteiro = !!r && (r.linhas.length > 0 || r.paragrafos.length > 0);
  const ehFoto = /foto|ensaio/i.test(grav.format ?? "");
  const agendado = grav.situacao === "agendado" || grav.situacao === "gravado";
  const temOrientacoes =
    !!grav.roupa ||
    grav.participantes.length > 0 ||
    grav.materiais.length > 0 ||
    !!grav.orientacoes ||
    !!grav.storyboardUrl;

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        grav.situacao === "agendado"
          ? "border-green-300 bg-green-50/50 ring-1 ring-green-200"
          : "border-black/5 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {grav.format ? (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${chipFormato(grav.format)}`}
          >
            {grav.format}
          </span>
        ) : null}
        <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700">
          {ehFoto ? "Fotos" : "Gravação"}
        </span>
        {grav.situacao === "gravado" ? (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
            Já gravado
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
          <span className="rounded-full bg-green-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
            {ehFoto ? "Ensaio marcado" : "Agendado"}
          </span>
        )}
        <span
          className={`ml-auto text-xs font-semibold ${agendado ? "text-green-700" : "text-gray-500"}`}
        >
          {grav.situacao === "a_remarcar" || grav.situacao === "a_agendar"
            ? "data a combinar"
            : `${fmtDia(grav.data)}${grav.hora ? ` · ${grav.hora}` : ""}`}
        </span>
      </div>

      <h3 className="mt-2 text-[15px] font-semibold leading-snug text-gray-900">
        {grav.title}
      </h3>
      {grav.local ? (
        <p className="mt-0.5 text-xs text-gray-500">Local: {grav.local}</p>
      ) : null}

      {temOrientacoes ? (
        <>
          <button
            type="button"
            onClick={() => setVerOrientacoes((v) => !v)}
            className="mt-2 text-xs font-semibold text-brand-700 hover:underline"
          >
            {verOrientacoes ? "Ocultar orientações" : "Ver orientações"}
          </button>
          {verOrientacoes ? (
            <div className="mt-2 space-y-2 rounded-xl border border-brand-100 bg-brand-50/50 p-3">
              {grav.orientacoes ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">
                    Como vai ser
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {grav.orientacoes}
                  </p>
                </div>
              ) : null}
              {grav.roupa ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">
                    Roupa / cores
                  </p>
                  <p className="mt-0.5 text-sm text-gray-700">{grav.roupa}</p>
                </div>
              ) : null}
              {grav.participantes.length > 0 ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">
                    Quem participa
                  </p>
                  <p className="mt-0.5 text-sm text-gray-700">
                    {grav.participantes.join(", ")}
                  </p>
                </div>
              ) : null}
              {grav.materiais.length > 0 ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">
                    O que levar
                  </p>
                  <p className="mt-0.5 text-sm text-gray-700">
                    {grav.materiais.join(", ")}
                  </p>
                </div>
              ) : null}
              {grav.storyboardUrl ? (
                <a
                  href={grav.storyboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  Ver storyboard do ensaio
                </a>
              ) : null}
            </div>
          ) : null}
        </>
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

/** Seção "Próximos conteúdos": junta o que falta gravar + o que está em edição. */
function SecaoProximos({
  gravacoes,
  emProducao,
}: {
  gravacoes: PortalGravacao[];
  emProducao: PortalPost[];
}) {
  const total = gravacoes.length + emProducao.length;
  if (total === 0) return null;
  return (
    <Secao
      titulo="Para produção"
      icone={<IcoProximos />}
      defaultAberto
      badge={
        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-700">
          {total}
        </span>
      }
    >
      {gravacoes.map((g) => (
        <CartaoGravacao key={g.id} grav={g} />
      ))}
      {emProducao.map((p) => (
        <CartaoPost key={p.id} post={p} />
      ))}
    </Secao>
  );
}

/** Seção recolhível: toque no título pra minimizar/abrir. */
function Colapsavel({
  titulo,
  icone,
  cor = "text-brand-800",
  defaultAberto = false,
  badge,
  children,
}: {
  titulo: string;
  icone: React.ReactNode;
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
        <span aria-hidden className="shrink-0">
          {icone}
        </span>
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
  icone,
  vazio,
  badge,
  defaultAberto = false,
  children,
}: {
  titulo: string;
  icone: React.ReactNode;
  vazio?: string;
  badge?: React.ReactNode;
  defaultAberto?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Colapsavel titulo={titulo} icone={icone} badge={badge} defaultAberto={defaultAberto}>
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
    iniISO,
    fimISO,
    resumoMes,
    resultado,
    postsSemana,
    postsMes,
    gravacoesSemana,
    emProducao,
    planoAcao,
    resultsSheetUrl,
  } = dados;

  // Plano de ação: o que a FAVIE está fazendo (em andamento, próximos, e a
  // LISTA do que já foi entregue). O que depende do cliente vai pro bloco
  // destacado "O que precisamos de você".
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

  // O que precisamos do cliente: TODOS os itens do cliente (feitos e a fazer).
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
        setFeitoCliente((m) => ({ ...m, [e.id]: !novo }));
        toast.erro(r.error ?? "Não foi possível salvar.");
      }
    });
  };
  const [verFeitosCliente, setVerFeitosCliente] = useState(false);
  const itensCliente = planoAcao.filter((e) => e.owner === "Cliente");
  const clientePendentes = itensCliente.filter((e) => !estaFeito(e));
  const clienteFeitos = itensCliente.filter((e) => estaFeito(e));
  const precisamosVoce = itensCliente;

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
            {rotuloData(e.dateLabel, feito) ? (
              <span className={feito ? "text-amber-700/50" : "text-amber-700"}>
                {" "}
                · {rotuloData(e.dateLabel, feito)}
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
          <p className="mt-2 text-xs text-white/50">Atualizado hoje</p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 pt-6">
        {/* 1. O que precisamos de você */}
        {precisamosVoce.length > 0 ? (
          <Colapsavel
            titulo="O que precisamos de você"
            icone={<IcoAcao />}
            cor="text-amber-800"
            defaultAberto
            badge={(() => {
              const pend = precisamosVoce.filter((e) => !estaFeito(e)).length;
              return pend > 0 ? (
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                  {pend} a fazer
                </span>
              ) : (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
                  tudo em dia
                </span>
              );
            })()}
          >
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
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
                  ✓ Tudo em dia por aqui, obrigada!
                </p>
              )}

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
                    Já feito ({clienteFeitos.length})
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

        {/* 2. Seus posts (semana + mês + entregas do mês) */}
        <SecaoPosts
          ini={iniISO}
          fim={fimISO}
          resumo={resumoMes}
          postsSemana={postsSemana}
          postsMes={postsMes}
        />

        {/* 3. Próximos conteúdos (a gravar + em edição) */}
        <SecaoProximos gravacoes={gravacoesSemana} emProducao={emProducao} />

        {/* 4. Plano de ação */}
        {planoFavie.length > 0 ? (
          <Colapsavel titulo="Plano de ação" icone={<IcoPlano />}>
            <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-gray-800">
                  Andamento
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

            {planoFeitos.length > 0 ? (
              <div className="mt-3 rounded-2xl border border-green-200 bg-green-50/60 p-4 shadow-sm">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-green-700">
                  Já feito ({planoFeitos.length})
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
                        {rotuloData(e.dateLabel, true) ? (
                          <span className="text-gray-400">
                            {" "}
                            · {rotuloData(e.dateLabel, true)}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Colapsavel>
        ) : null}

        {/* 5. Resultados */}
        <ResultadoBloco
          token={token}
          resultado={resultado}
          planilhaUrl={resultsSheetUrl}
        />

        <p className="mt-10 text-center text-xs text-gray-400">
          favie · acompanhamento de resultados
        </p>
      </div>
    </main>
  );
}
