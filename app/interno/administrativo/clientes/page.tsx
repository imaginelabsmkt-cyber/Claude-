import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { AdministrativoTabs } from "@/components/interno/administrativo-tabs";
import { ContratosPanel } from "@/components/contratos/contratos-panel";
import { MonthNav } from "@/components/financeiro/month-nav";
import { listarContratosDeCliente } from "@/lib/data/contratos";
import { listarClientesFinanceiro } from "@/lib/data/financeiro";
import { obterCarteira } from "@/lib/data/comercial";
import {
  contratosQuePedemConversa,
  receitaContratada,
} from "@/lib/empresa/contratos";
import { mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";
import { formatarData, formatarMoeda, formatarPercentual } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { mes?: string };
}

/**
 * Clientes: quem é cliente, por quanto e até quando.
 *
 * A tela abre pelo que PEDE AÇÃO (contrato vencendo, reajuste na hora)
 * e só depois mostra a leitura. É a ordem inversa da que eu tinha
 * feito, e é o que as referências de painel financeiro recomendam:
 * primeiro a decisão, depois o dado.
 *
 * Esta tela é do Administrativo, não do Comercial. O Comercial é a
 * conquista de quem ainda NÃO é cliente; aqui é quem já é.
 */
export default async function ClientesPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();
  const hoje = new Date().toISOString().slice(0, 10);

  const [contratos, clientes, carteira] = await Promise.all([
    listarContratosDeCliente(),
    listarClientesFinanceiro(),
    obterCarteira(mes),
  ]);

  const conversas = contratosQuePedemConversa(contratos, hoje);
  const contratado = receitaContratada(contratos);
  const cobertura = carteira.custoFixo ? contratado / carteira.custoFixo : 0;
  const falta = carteira.custoFixo - contratado;
  const ativos = contratos.filter((c) => c.status === "Ativo").length;
  const semContrato = carteira.ativos.filter(
    (c) => !contratos.some((k) => k.client_id === c.id && k.status === "Ativo"),
  );

  return (
    <>
      <AreaHeader
        titulo="Clientes"
        contexto={rotuloMes(mes)}
        acao={<MonthNav mes={mes} />}
      />

      <AdministrativoTabs />

      {conversas.length > 0 ? (
        <>
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Precisa de conversa
          </h2>
          <ul className="mb-6 space-y-2">
            {conversas.map(({ contrato, motivo, dias }) => (
              <li
                key={contrato.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-gray-200 bg-white px-4 py-3"
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
        </>
      ) : null}

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-base font-semibold text-gray-900">
          {ativos} contrato(s) ativo(s) somam {formatarMoeda(contratado)} por mês
        </h2>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className={"h-full rounded-full " + (falta > 0 ? "bg-alerta" : "bg-area")}
            style={{ width: `${Math.min(cobertura * 100, 100)}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-600">
          {falta > 0 ? (
            <>
              Cobre {formatarPercentual(Math.min(cobertura, 1))} do custo fixo de{" "}
              {formatarMoeda(carteira.custoFixo)}.{" "}
              <strong className="font-semibold text-alerta">
                Faltam {formatarMoeda(falta)} por mês.
              </strong>
            </>
          ) : (
            <>
              Cobre o custo fixo de {formatarMoeda(carteira.custoFixo)} e sobram{" "}
              <strong className="font-semibold text-gray-900">
                {formatarMoeda(Math.abs(falta))} por mês
              </strong>
              .
            </>
          )}
        </p>
      </div>

      {semContrato.length > 0 ? (
        <p className="mb-5 border-l-4 border-alerta bg-alerta-soft py-2 pl-3 text-sm text-gray-700">
          <strong>
            {semContrato.length} cliente(s) pagam sem contrato cadastrado
          </strong>{" "}
          ({semContrato.map((c) => c.nome).join(", ")}). Cadastre o contrato
          abaixo para o sistema saber até quando vale e quando reajustar.
        </p>
      ) : null}

      <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        Contratos
      </h2>
      <ContratosPanel contratos={contratos} clientes={clientes} hoje={hoje} />

      <p className="mt-6 border-l-4 border-area pl-3 text-sm text-gray-600">
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
