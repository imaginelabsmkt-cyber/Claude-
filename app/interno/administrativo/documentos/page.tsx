import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { ClientesTabs } from "@/components/interno/clientes-tabs";
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

export const metadata = { title: "Documentos" };

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

      <ClientesTabs />

      <Secao
        titulo="Prazos do administrativo"
      >
        <ObrigacoesPanel obrigacoes={obrigacoes} area="administrativo" />
      </Secao>

      <Secao
        titulo="Documentos da empresa"
      >
        <DocumentosPanel documentos={documentos} />
      </Secao>

      <Secao
        titulo="Contratos assinados"
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
    </>
  );
}
