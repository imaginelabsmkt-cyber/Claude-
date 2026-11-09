"use client";

import { useState } from "react";
import {
  escalaDeSaldo,
  type PontoDeCaixa,
} from "@/lib/interno/ano";
import { curvaSuave, type Ponto } from "@/lib/interno/curva";
import {
  CORES,
  ESTREITA,
  LARGA,
  TRACO,
  rotuloValor,
  type Geometria,
} from "@/components/interno/grafico-base";
import { rotuloMes, rotuloMesCurto } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

/**
 * A linha precisa de margem à direita, e as colunas não.
 *
 * O saldo do último mês é escrito ao lado do ponto, e a primeira versão
 * empurrava esse texto para dentro do desenho: ele caía em cima do
 * próprio ponto e da linha. Reservar a faixa é o que resolve de uma vez,
 * em vez de ficar adivinhando para que lado o texto cabe.
 */
function comFaixaDoRotulo(geo: Geometria, faixa: number): Geometria {
  return { ...geo, margem: { ...geo.margem, direita: faixa } };
}

interface DesenhoProps {
  geo: Geometria;
  pontos: PontoDeCaixa[];
  /** Todos os meses da régua de baixo, em ordem. */
  meses: string[];
  /** Mês que a pessoa escolheu clicando. */
  escolhido: string | null;
  aoEscolher: (mes: string) => void;
  className: string;
  descricao: string;
}

/** A linha do caixa, numa medida. */
function Desenho({
  geo,
  pontos,
  meses,
  escolhido,
  aoEscolher,
  className,
  descricao,
}: DesenhoProps) {
  const { largura: L, altura: A, margem: M, fonte } = geo;
  const ploteA = A - M.topo - M.baixo;

  // Com muitos meses os rótulos encostam um no outro. Aí só uma parte
  // deles é escrita; a linha continua com todos os pontos.
  const deQuantos = meses.length > 24 ? 6 : meses.length > 14 ? 2 : 1;

  const escala = escalaDeSaldo(pontos.map((p) => p.saldo));
  const amplitude = escala.max - escala.min;
  const y = (valor: number) =>
    M.topo + ploteA - ((valor - escala.min) / amplitude) * ploteA;
  const yZero = y(0);

  const ploteL = L - M.esquerda - M.direita;
  const passo = ploteL / Math.max(meses.length, 1);
  const centro = (i: number) => M.esquerda + passo * i + passo / 2;

  const emTela: Ponto[] = pontos.map((p) => ({
    x: centro(Math.max(0, meses.indexOf(p.mes))),
    y: y(p.saldo),
  }));

  const linha = curvaSuave(emTela);
  // A mancha vai da linha até o zero, não até o chão do desenho: com
  // caixa negativo, descer até o chão pintaria uma área que atravessa
  // o próprio eixo e deixa de querer dizer alguma coisa.
  const mancha =
    emTela.length >= 2
      ? `${linha} L${emTela[emTela.length - 1].x} ${yZero} L${emTela[0].x} ${yZero} Z`
      : "";

  const ultimo = pontos[pontos.length - 1];
  const ultimoEmTela = emTela[emTela.length - 1];
  const negativo = ultimo !== undefined && ultimo.saldo < 0;
  const corDaLinha = negativo ? CORES.alerta : CORES.caixa;

  return (
    <svg
      viewBox={`0 0 ${L} ${A}`}
      className={`h-auto w-full ${className}`}
      role="img"
      aria-label={descricao}
    >
      {escala.marcas.map((m) => (
        <g key={m}>
          <line
            x1={M.esquerda}
            x2={L - M.direita}
            y1={y(m)}
            y2={y(m)}
            stroke={m === 0 ? TRACO.eixo : TRACO.grade}
            strokeWidth={1}
          />
          <text
            x={M.esquerda - 8}
            y={y(m) + fonte / 3}
            textAnchor="end"
            fill={TRACO.texto}
            style={{ fontSize: fonte }}
          >
            {rotuloValor(m, escala.max - escala.min)}
          </text>
        </g>
      ))}

      {mancha ? (
        <path d={mancha} fill={corDaLinha} opacity={0.1} />
      ) : null}

      {linha ? (
        <path
          d={linha}
          fill="none"
          stroke={corDaLinha}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {emTela.map((p, i) => (
        <circle
          key={pontos[i].mes}
          cx={p.x}
          cy={p.y}
          r={pontos[i].mes === escolhido ? 6 : 4}
          fill={corDaLinha}
          stroke={TRACO.papel}
          strokeWidth={2}
        />
      ))}

      {/* Uma faixa de clique por mês, de cima a baixo: acertar um ponto
          de 8px no celular é impossível. */}
      {meses.map((mes, i) => {
        const temPonto = pontos.some((p) => p.mes === mes);
        const saldo = pontos.find((p) => p.mes === mes)?.saldo;
        return (
          <rect
            key={`toque-${mes}`}
            x={M.esquerda + passo * i}
            y={M.topo}
            width={passo}
            height={ploteA + M.baixo}
            fill="transparent"
            className={temPonto ? "cursor-pointer" : undefined}
            onClick={() => (temPonto ? aoEscolher(mes) : undefined)}
            onMouseEnter={() => (temPonto ? aoEscolher(mes) : undefined)}
          >
            <title>
              {temPonto
                ? `${rotuloMesCurto(mes)}: ${formatarMoeda(saldo ?? 0)} em caixa`
                : `${rotuloMesCurto(mes)}: sem lançamento`}
            </title>
          </rect>
        );
      })}

      {/* Um rótulo só, no último mês: é o saldo de hoje. Fica na faixa
          reservada à direita, onde a linha nunca chega. */}
      {ultimoEmTela && ultimo ? (
        <text
          x={ultimoEmTela.x + 9}
          y={ultimoEmTela.y + fonte / 3}
          textAnchor="start"
          fill={negativo ? CORES.alerta : TRACO.mes}
          style={{ fontSize: fonte, fontWeight: 700 }}
        >
          {formatarMoeda(ultimo.saldo)}
        </text>
      ) : null}

      {meses.map((mes, i) => {
        if (i % deQuantos !== 0 && i !== meses.length - 1) return null;
        const tem = pontos.some((p) => p.mes === mes);
        return (
          <text
            key={mes}
            x={centro(i)}
            y={A - M.baixo / 4}
            textAnchor="middle"
            fill={tem ? TRACO.mes : TRACO.mesVazio}
            style={{
              fontSize: fonte,
              fontWeight: mes === escolhido ? 700 : 400,
            }}
          >
            {meses.length > 14
              ? rotuloMesCurto(mes)
              : rotuloMesCurto(mes).slice(0, 3)}
          </text>
        );
      })}
    </svg>
  );
}

interface GraficoCaixaProps {
  pontos: PontoDeCaixa[];
  /**
   * A régua de baixo. No Início são os doze meses do ano; no Fluxo de
   * caixa são todos os meses lançados, que podem ser trinta.
   */
  meses: string[];
}

/**
 * O caixa ao longo do ano.
 *
 * As colunas de entrou e saiu respondem "como foi cada mês". Esta linha
 * responde outra coisa: "para onde isso está indo". É a pergunta que a
 * Fran faz olhando o fim da linha, não o começo.
 *
 * A linha fica vinho enquanto o caixa está positivo e vermelha de
 * alerta se o último mês fechou negativo, porque aí não é mais uma
 * leitura, é um aviso.
 */
export function GraficoCaixa({ pontos, meses }: GraficoCaixaProps) {
  const [escolhido, setEscolhido] = useState<string | null>(
    pontos[pontos.length - 1]?.mes ?? null,
  );

  if (pontos.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        Ainda não há mês lançado para desenhar a linha.
      </p>
    );
  }

  const descricao = `Caixa no fim de cada mês. ${pontos
    .map((p) => `${rotuloMesCurto(p.mes)}: ${formatarMoeda(p.saldo)}`)
    .join(". ")}`;

  const indice = pontos.findIndex((p) => p.mes === escolhido);
  const lido = indice >= 0 ? pontos[indice] : null;
  const anterior = indice > 0 ? pontos[indice - 1] : null;
  const variacao = lido && anterior ? lido.saldo - anterior.saldo : null;

  return (
    <figure className="m-0">
      <Desenho
        geo={comFaixaDoRotulo(ESTREITA, 52)}
        pontos={pontos}
        meses={meses}
        escolhido={escolhido}
        aoEscolher={setEscolhido}
        className="sm:hidden"
        descricao={descricao}
      />
      <Desenho
        geo={comFaixaDoRotulo(LARGA, 84)}
        pontos={pontos}
        meses={meses}
        escolhido={escolhido}
        aoEscolher={setEscolhido}
        className="hidden sm:block"
        descricao={descricao}
      />

      {/* A leitura do mês escolhido, com altura fixa para o gráfico não
          pular quando a pessoa passa de um mês para outro. */}
      <figcaption className="mt-3 flex min-h-[2.75rem] flex-wrap items-baseline gap-x-5 gap-y-1 rounded-xl bg-gray-50 px-3 py-2">
        {lido ? (
          <>
            <span className="text-sm font-bold text-gray-900">
              {rotuloMes(lido.mes)}
            </span>
            <span className="text-sm text-gray-600">
              terminou com{" "}
              <strong
                className={
                  "font-semibold tabular-nums " +
                  (lido.saldo < 0 ? "text-alerta" : "text-gray-900")
                }
              >
                {formatarMoeda(lido.saldo)}
              </strong>
            </span>
            {variacao !== null ? (
              <span className="text-sm text-gray-600">
                {variacao >= 0 ? "subiu" : "caiu"}{" "}
                <strong
                  className={
                    "font-semibold tabular-nums " +
                    (variacao < 0 ? "text-alerta" : "text-gray-900")
                  }
                >
                  {formatarMoeda(Math.abs(variacao))}
                </strong>{" "}
                no mês
              </span>
            ) : null}
          </>
        ) : null}
      </figcaption>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700">
          Ver todos os meses
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th scope="col" className="py-1.5 pr-3 font-semibold text-gray-600">
                  Mês
                </th>
                <th scope="col" className="py-1.5 text-right font-semibold text-gray-600">
                  Caixa no fim do mês
                </th>
              </tr>
            </thead>
            <tbody>
              {pontos.map((p) => (
                <tr key={p.mes} className="border-b border-gray-100">
                  <th scope="row" className="py-1.5 pr-3 text-left font-normal text-gray-700">
                    {rotuloMesCurto(p.mes)}
                  </th>
                  <td
                    className={
                      "py-1.5 text-right font-semibold tabular-nums " +
                      (p.saldo < 0 ? "text-alerta" : "text-gray-900")
                    }
                  >
                    {formatarMoeda(p.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
