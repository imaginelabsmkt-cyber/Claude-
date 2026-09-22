"use client";

import Link from "next/link";
import { useState } from "react";
import {
  STATUS_CLIENTE,
  type DadosPortal,
  type PortalGravacao,
  type PortalPost,
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

function CartaoPost({ post }: { post: PortalPost }) {
  const [aberto, setAberto] = useState(false);
  const st = STATUS_CLIENTE[post.status];
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
    <div className="mt-4 rounded-2xl border border-black/5 bg-brand-50 p-4 shadow-sm">
      <p className="text-sm font-bold capitalize text-brand-800">
        {resumo.label}
      </p>
      <div className="mt-2 flex gap-2">
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
        <span className="ml-auto text-xs font-medium text-gray-500">
          {fmtDia(grav.data)}
          {grav.hora ? ` · ${grav.hora}` : ""}
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
    <section className="mt-6">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand-800">
        <span aria-hidden>{emoji}</span>
        {titulo}
      </h2>
      {vazio ? (
        <p className="rounded-xl border border-dashed border-brand-200 bg-white/60 px-4 py-3 text-sm text-gray-400">
          {vazio}
        </p>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </section>
  );
}

export function PortalView({
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
    postsSemana,
    gravacoesSemana,
    emProducao,
    pausadosCancelados,
    demandas,
  } = dados;

  // Demandas agrupadas por área.
  const grupos = new Map<string, typeof demandas>();
  for (const d of demandas) {
    const k = d.category?.trim() || "Geral";
    grupos.set(k, [...(grupos.get(k) ?? []), d]);
  }

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
            O que está acontecendo com o seu conteúdo, de forma simples.
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

        <ResumoMesCard resumo={resumoMes} />

        <Secao
          titulo="Essa semana vai ao ar"
          emoji="📅"
          vazio={
            postsSemana.length === 0
              ? "Nenhum post programado para esta semana."
              : undefined
          }
        >
          {postsSemana.map((p) => (
            <CartaoPost key={p.id} post={p} />
          ))}
        </Secao>

        {gravacoesSemana.length > 0 ? (
          <Secao titulo="Gravações da semana" emoji="🎥">
            {gravacoesSemana.map((g) => (
              <CartaoGravacao key={g.id} grav={g} />
            ))}
          </Secao>
        ) : null}

        <Secao
          titulo="Em produção"
          emoji="🎬"
          vazio={
            emProducao.length === 0
              ? "Nada em produção no momento."
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

        <Secao
          titulo="O que estamos fazendo por você"
          emoji="✅"
          vazio={
            demandas.length === 0
              ? "Nenhuma tarefa em andamento agora."
              : undefined
          }
        >
          {[...grupos.entries()].map(([area, itens]) => (
            <div
              key={area}
              className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                {area}
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {itens.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <span
                      className={
                        "h-2 w-2 shrink-0 rounded-full " +
                        (d.status === "Fazendo"
                          ? "bg-amber-400"
                          : "bg-gray-300")
                      }
                      aria-hidden
                    />
                    <span>{d.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Secao>

        <p className="mt-10 text-center text-xs text-gray-400">
          Feito com carinho pela favie 💛
        </p>
      </div>
    </main>
  );
}
