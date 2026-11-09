import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { AdministrativoTabs } from "@/components/interno/administrativo-tabs";
import { ContratosPanel } from "@/components/contratos/contratos-panel";
import { Secao } from "@/components/interno/secao";
import { listarContratosDeCliente } from "@/lib/data/contratos";
import { listarClientesFinanceiro } from "@/lib/data/financeiro";
import { obterCarteira } from "@/lib/data/comercial";
import { receitaContratada } from "@/lib/empresa/contratos";
import { contratosQuePedemConversa } from "@/lib/empresa/contratos";
import { mesAtual, hojeISO } from "@/lib/financeiro/meses";
import { formatarData, formatarMoeda } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Clientes" };

/**
 * Clientes: quem é cliente da Favie, desde quando e com qual contrato.
 *
 * ESTA TELA NÃO TEM MÊS. Ela tinha, e a Fran apontou que não fazia
 * sentido: cliente não é um mês. A navegação de mês veio junto com um
 * medidor de "quanto as mensalidades cobrem do custo fixo", que é
 * leitura de DINHEIRO, não de organização. Esse medidor já existe no
 * Início, que é onde ele responde alguma coisa. Aqui ele só empurrava
 * a relação de clientes para baixo da dobra.
 *
 * O que sobrou é o que é administrativo: quem são os clientes, o que
 * está combinado com cada um, o que pede conversa, e quem já saiu.
 */
export default async function ClientesPage() {
  const hoje = hojeISO();

  const [contratos, clientes, carteira] = await Promise.all([
    listarContratosDeCliente(),
    listarClientesFinanceiro(),
    // A carteira é "hoje", não um mês escolhido: é a relação de quem é
    // cliente agora.
    obterCarteira(mesAtual()),
  ]);

  const conversas = contratosQuePedemConversa(contratos, hoje);
  const contratado = receitaContratada(contratos);
  const semContrato = carteira.ativos
    .filter(
      (c) => !contratos.some((k) => k.client_id === c.id && k.status === "Ativo"),
    )
    .map((c) => ({ id: c.id, name: c.nome }));

  const naRelacao = carteira.ativos.length;

  return (
    <>
      <AreaHeader
        contexto={
          naRelacao === 0
            ? "Nenhum cliente ativo"
            : `${naRelacao} ${naRelacao === 1 ? "cliente ativo" : "clientes ativos"}, somando ${formatarMoeda(contratado)} por mês em contrato`
        }
      />

      <AdministrativoTabs />

      {conversas.length > 0 ? (
        <Secao
          titulo="Precisa de conversa"
        >
          <ul className="space-y-2">
            {conversas.map(({ contrato, motivo, dias }) => (
              <li
                key={contrato.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
              >
                <span
                  aria-hidden="true"
                  className={
                    "h-9 w-1.5 shrink-0 rounded-full " +
                    (motivo === "Vencido" ? "bg-alerta" : "bg-area")
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-gray-900">
                    {contrato.client?.name ?? "Cliente removido"}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {motivo === "Vencido"
                      ? `Contrato venceu há ${Math.abs(dias ?? 0)} dia(s)`
                      : motivo === "Vence em breve"
                        ? `Contrato vence em ${dias} dia(s), em ${formatarData(contrato.end_date ?? "")}`
                        : `Reajuste por ${contrato.readjust_index} está na hora`}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                  {formatarMoeda(Number(contrato.monthly_amount))}
                </span>
              </li>
            ))}
          </ul>
        </Secao>
      ) : null}

      <Secao
        titulo="Quem é cliente hoje"
      >
        <ContratosPanel
          contratos={contratos}
          clientes={clientes}
          semContrato={semContrato}
          hoje={hoje}
        />
      </Secao>

      {carteira.inativos.length > 0 ? (
        <Secao
          titulo="Quem já foi cliente"
        >
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {carteira.inativos.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5"
              >
                <span className="min-w-0 flex-1 text-sm font-medium text-gray-700">
                  {c.nome}
                </span>
                <span className="shrink-0 text-xs text-gray-500">
                  último pagamento em {c.ultimoMes}
                </span>
                <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-700">
                  {formatarMoeda(c.ultimoValor)}
                </span>
              </li>
            ))}
          </ul>
        </Secao>
      ) : null}

      <p className="border-l-4 border-area pl-3 text-sm text-gray-600">
        O contrato manda no valor: mudou a mensalidade aqui, a cobrança no{" "}
        <Link
          href="/interno/financeiro/recorrencias"
          className="font-medium text-area hover:underline"
        >
          financeiro
        </Link>{" "}
        acompanha sozinha. O arquivo assinado é anexo do cliente e fica em{" "}
        <Link
          href="/interno/administrativo/documentos"
          className="font-medium text-area hover:underline"
        >
          Documentos
        </Link>
        .
      </p>
    </>
  );
}
