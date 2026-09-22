import { AreaHeader } from "@/components/interno/area-header";
import { Stat } from "@/components/interno/stat";
import { RecorteLista } from "@/components/interno/recorte-lista";
import { DocumentosPanel } from "@/components/empresa/documentos-panel";
import { ObrigacoesPanel } from "@/components/empresa/obrigacoes-panel";
import { ContratosLista } from "@/components/empresa/contratos-lista";
import { MonthNav } from "@/components/financeiro/month-nav";
import { obterRecorteArea } from "@/lib/data/interno";
import {
  listarContratos,
  listarDocumentosEmpresa,
  listarObrigacoes,
} from "@/lib/data/empresa";
import { mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { mes?: string };
}

/**
 * Administrativo: o que a empresa assina e paga todo mês.
 * Recorte das ferramentas e equipamentos sobre o financeiro.
 */
export default async function AdministrativoPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();

  const [recorte, documentos, contratos, obrigacoes] = await Promise.all([
    obterRecorteArea("administrativo", mes),
    listarDocumentosEmpresa(),
    listarContratos(),
    listarObrigacoes("administrativo"),
  ]);

  // As assinaturas são o grosso: vale ver por ferramenta, do maior ao menor.
  const porFerramenta = [...recorte.lancamentos].sort(
    (a, b) => Number(b.amount) - Number(a.amount),
  );

  return (
    <>
      <AreaHeader
        titulo="Administrativo"
        contexto={rotuloMes(mes)}
        acao={<MonthNav mes={mes} />}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          rotulo="Do mês"
          valor={formatarMoeda(recorte.realizado + recorte.pendente)}
        />
        <Stat
          rotulo="Ferramentas fixas"
          valor={formatarMoeda(recorte.mensal)}
          detalhe="Assinaturas recorrentes"
        />
        <Stat rotulo="Itens no mês" valor={String(recorte.lancamentos.length)} />
        <Stat
          rotulo="Documentos"
          valor={String(documentos.length + contratos.length)}
          detalhe={`${contratos.length} contrato(s) de cliente`}
        />
      </div>

      <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        Assinaturas e equipamentos, do mais caro ao mais barato
      </h2>
      <RecorteLista
        lancamentos={porFerramenta}
        vazio="Nenhuma assinatura ou equipamento lançado neste mês."
      />

      <p className="mt-4 border-l-4 border-area pl-3 text-sm text-gray-600">
        Os valores saem do financeiro, das categorias de assinaturas e
        equipamentos — é o mesmo dado visto por ferramenta.
      </p>

      <h2 className="mb-2 mt-7 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        Contratos de clientes
      </h2>
      <ContratosLista contratos={contratos} />

      <h2 className="mb-2 mt-7 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        Documentos da empresa
      </h2>
      <DocumentosPanel documentos={documentos} />

      <h2 className="mb-2 mt-7 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        Prazos do administrativo
      </h2>
      <ObrigacoesPanel obrigacoes={obrigacoes} area="administrativo" />
    </>
  );
}
