import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { AdministrativoTabs } from "@/components/interno/administrativo-tabs";
import { Secao } from "@/components/interno/secao";
import { DocumentosPanel } from "@/components/empresa/documentos-panel";
import { ObrigacoesPanel } from "@/components/empresa/obrigacoes-panel";
import { ContratosLista } from "@/components/empresa/contratos-lista";
import {
  listarContratos,
  listarDocumentosEmpresa,
  listarObrigacoes,
} from "@/lib/data/empresa";

export const dynamic = "force-dynamic";

/**
 * Documentos: os papéis da empresa e os prazos que vêm com eles.
 *
 * ESTA TELA NÃO TEM MÊS, e não tem mais ferramentas.
 *
 * Ela mostrava "Ferramentas fixas" e uma lista de assinaturas e
 * equipamentos do mais caro ao mais barato. A regra da Fran é clara e
 * é o contrário disso: "as ferramentas vão estar dentro do financeiro,
 * porque a gente só quer saber quais ferramentas a gente utiliza para
 * saber quanto que a gente paga". Isso vive em Financeiro, em Fixos e
 * ferramentas, e aqui virava um terceiro lugar com o mesmo dado.
 *
 * E ela repetia a lista de contratos de clientes, que é a aba ao lado.
 * Aqui ficam só os ARQUIVOS assinados, que é outra coisa: um é o que
 * está combinado, o outro é o papel que prova.
 */
export default async function DocumentosPage() {
  const [documentos, contratos, obrigacoes] = await Promise.all([
    listarDocumentosEmpresa(),
    listarContratos(),
    listarObrigacoes("administrativo"),
  ]);

  const abertas = obrigacoes.filter((o) => o.aberto !== null).length;

  return (
    <>
      <AreaHeader
        contexto={
          abertas > 0
            ? `${documentos.length + contratos.length} arquivos · ${abertas} ${abertas === 1 ? "prazo em aberto" : "prazos em aberto"}`
            : `${documentos.length + contratos.length} arquivos guardados`
        }
      />

      <AdministrativoTabs />

      <Secao
        titulo="Prazos do administrativo"
        explicacao="O que precisa ser renovado, entregue ou assinado, e quando. Se não estiver aqui, ninguém vai lembrar."
      >
        <ObrigacoesPanel obrigacoes={obrigacoes} area="administrativo" />
      </Secao>

      <Secao
        titulo="Documentos da empresa"
        explicacao="Contrato social, alvará, certidões: o que é da Favie e não de um cliente."
      >
        <DocumentosPanel documentos={documentos} />
      </Secao>

      <Secao
        titulo="Contratos assinados"
        explicacao="O arquivo em PDF de cada cliente. O que está combinado dentro dele fica na aba Clientes."
        acao={
          <Link
            href="/interno/administrativo/clientes"
            className="font-medium text-gray-600 hover:underline"
          >
            Ver os clientes
          </Link>
        }
      >
        <ContratosLista contratos={contratos} />
      </Secao>

      <p className="border-l-4 border-area pl-3 text-sm text-gray-600">
        Procurando quanto a gente paga de ferramenta? Isso é dinheiro, então
        fica em{" "}
        <Link
          href="/interno/financeiro/recorrencias"
          className="font-medium text-area hover:underline"
        >
          Financeiro, em Fixos e ferramentas
        </Link>
        .
      </p>
    </>
  );
}
