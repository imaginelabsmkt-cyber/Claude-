import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { Secao } from "@/components/interno/secao";
import { Stat } from "@/components/interno/stat";
import { OrigemItem, OrigemLista } from "@/components/interno/origem-item";
import { listarAtividades, listarLeads } from "@/lib/data/comercial";
import { listarLancamentos } from "@/lib/data/financeiro";
import {
  montarFila,
  pedemAtencao,
  prazoEmPalavras,
} from "@/lib/comercial/atividades";
import { estaParado, diasParado } from "@/lib/comercial/funil";
import { quandoEhAReuniao, reuniaoPassou } from "@/lib/comercial/reuniao";
import { situacaoDoLancamento } from "@/lib/financeiro/vencimento";
import { mesAtual, hojeISO } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";
import { LEAD_STAGES_ABERTAS } from "@/types";
import type { AtividadeComDono } from "@/lib/data/comercial";

export const dynamic = "force-dynamic";

export const metadata = { title: "Fila de trabalho" };

/**
 * A fila de trabalho: o que precisa de você hoje, de todas as áreas.
 *
 * Do raio-X do Zoho que a Vitória fez, sobre esta tela: "é a tela que
 * mais vale replicar primeiro. Ela responde 'o que eu faço agora?'
 * sem relatório nenhum." E: "na lista, o vencimento aparece em
 * linguagem simples ('Hoje', 'Ontem', 'Atrasado em 2 dias'), com
 * atrasos em vermelho."
 *
 * A ordem é a da urgência, não a da área: o que venceu primeiro, o
 * que é hoje depois, e o que está apodrecendo em silêncio por último.
 * Dinheiro, comercial e atividade entram na mesma fila — quem abre
 * esta tela de manhã não quer escolher área, quer saber o que fazer.
 */
export default async function FilaPage() {
  const agora = new Date();
  const hoje = hojeISO();
  const mes = mesAtual();

  const [atividades, leads, lancamentos] = await Promise.all([
    listarAtividades({ abertas: true }),
    listarLeads(LEAD_STAGES_ABERTAS),
    listarLancamentos({ mes }),
  ]);

  const fila = montarFila(atividades, agora);
  const agora_pedem = pedemAtencao(fila);

  /* Reuniões marcadas que ainda não aconteceram, mais as que já
     passaram e ninguém mexeu — essas são as que mais doem. */
  const reunioes = leads
    .filter((l) => l.meeting_at)
    .sort((a, b) => (a.meeting_at ?? "").localeCompare(b.meeting_at ?? ""));
  const reuniaoVencida = reunioes.filter((l) =>
    reuniaoPassou(l.meeting_at, agora),
  );

  /* Oportunidades paradas além do prazo da etapa. */
  const parados = leads.filter((l) => estaParado(l, agora));

  /* Contas em atraso, dos dois lados. */
  const vencidos = lancamentos.filter(
    (l) => situacaoDoLancamento(l, hoje) === "Vencido" && l.status !== "Pago",
  );

  const nada =
    agora_pedem === 0 &&
    reunioes.length === 0 &&
    parados.length === 0 &&
    vencidos.length === 0;

  const linhaDaAtividade = (a: AtividadeComDono) => {
    const dono = a.leadNome ?? a.clienteNome ?? "";
    const atrasada = fila.atrasadas.includes(a);
    const prazo = prazoEmPalavras(a.due_at, agora);
    return (
      <OrigemItem
        key={a.id}
        origem="comercial"
        titulo={a.subject}
        descricao={dono ? `${a.kind} · ${dono}` : a.kind}
        prazo={atrasada ? `venceu ${prazo}` : prazo}
        atrasado={atrasada}
      />
    );
  };

  return (
    <>
      <AreaHeader
        titulo="Fila de trabalho"
        contexto="Pendências de hoje"
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          rotulo="Pendentes"
          valor={String(agora_pedem)}
          alerta={agora_pedem > 0}
          detalhe="atividades em atraso ou de hoje"
        />
        <Stat
          rotulo="Reuniões marcadas"
          valor={String(reunioes.length)}
          alerta={reuniaoVencida.length > 0}
          detalhe={
            reuniaoVencida.length > 0
              ? `${reuniaoVencida.length} em atraso`
              : "nenhuma em atraso"
          }
        />
        <Stat
          rotulo="Sem movimentação"
          valor={String(parados.length)}
          origem="comercial"
          alerta={parados.length > 0}
          detalhe="oportunidades além do prazo"
        />
        <Stat
          rotulo="Em atraso"
          valor={String(vencidos.length)}
          origem="financeiro"
          alerta={vencidos.length > 0}
          detalhe="títulos em aberto no mês"
        />
      </div>

      {nada ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
          <p className="font-medium text-gray-900">Nenhuma pendência</p>
        </div>
      ) : null}

      {fila.atrasadas.length > 0 ? (
        <Secao titulo={`Em atraso (${fila.atrasadas.length})`}>
          <OrigemLista>{fila.atrasadas.map(linhaDaAtividade)}</OrigemLista>
        </Secao>
      ) : null}

      {fila.hoje.length > 0 ? (
        <Secao titulo={`Hoje (${fila.hoje.length})`}>
          <OrigemLista>{fila.hoje.map(linhaDaAtividade)}</OrigemLista>
        </Secao>
      ) : null}

      {reunioes.length > 0 ? (
        <Secao
          titulo="Reuniões"
          acao={
            <Link
              href="/interno/comercial/funil?v=lista"
              className="font-medium text-gray-600 hover:underline"
            >
              Abrir o funil
            </Link>
          }
        >
          <OrigemLista>
            {reunioes.map((l) => (
              <OrigemItem
                key={l.id}
                origem="comercial"
                titulo={l.name}
                descricao={`${l.stage} · ${l.channel}`}
                valor={formatarMoeda(Number(l.estimated_monthly))}
                prazo={quandoEhAReuniao(l.meeting_at!, agora)}
                atrasado={reuniaoPassou(l.meeting_at, agora)}
              />
            ))}
          </OrigemLista>
        </Secao>
      ) : null}

      {vencidos.length > 0 ? (
        <Secao
          titulo={`Contas em atraso (${vencidos.length})`}
          acao={
            <Link
              href={`/interno/financeiro?mes=${mes}`}
              className="font-medium text-gray-600 hover:underline"
            >
              Abrir o financeiro
            </Link>
          }
        >
          <OrigemLista>
            {vencidos.map((l) => (
              <OrigemItem
                key={l.id}
                origem="financeiro"
                titulo={l.description}
                descricao={l.kind === "Receita" ? "a receber" : "a pagar"}
                valor={formatarMoeda(Number(l.amount))}
                prazo={`venceu ${prazoEmPalavras(l.due_date, agora)}`}
                atrasado
              />
            ))}
          </OrigemLista>
        </Secao>
      ) : null}

      {parados.length > 0 ? (
        <Secao titulo={`Sem movimentação (${parados.length})`}>
          <OrigemLista>
            {parados.map((l) => {
              const d = diasParado(l, agora);
              return (
                <OrigemItem
                  key={l.id}
                  origem="comercial"
                  titulo={l.name}
                  descricao={l.stage}
                  valor={formatarMoeda(Number(l.estimated_monthly))}
                  prazo={`${d} dia${d > 1 ? "s" : ""} sem movimentação`}
                  atrasado
                />
              );
            })}
          </OrigemLista>
        </Secao>
      ) : null}

      {fila.proximas.length > 0 || fila.semPrazo.length > 0 ? (
        <Secao titulo="Depois">
          <OrigemLista>
            {[...fila.proximas, ...fila.semPrazo].map(linhaDaAtividade)}
          </OrigemLista>
        </Secao>
      ) : null}
    </>
  );
}
