import { PageHeader } from "@/components/layout/page-header";
import {
  RelatoriosSemanais,
  type RelContent,
  type RelDemanda,
  type RelCliente,
} from "@/components/relatorios/relatorios-semanais";
import { listarClientes } from "@/lib/data/clients";
import { listContents } from "@/lib/data/contents";
import { listDemandsFeitas } from "@/lib/data/demands";
import { hojeISO, estaGravado, ehArte } from "@/lib/rules/contents";

export const dynamic = "force-dynamic";

/**
 * Relatórios semanais por cliente: gera sozinho o que foi ENTREGUE na semana
 * (conteúdos publicados + demandas concluídas), pronto para copiar e enviar.
 */
export default async function RelatoriosPage() {
  // Janela de ~9 semanas para permitir navegar semanas anteriores.
  const hojeRef = new Date();
  const inicioJanela = new Date(hojeRef);
  inicioJanela.setDate(inicioJanela.getDate() - 63);
  const de = hojeISO(inicioJanela);
  const ate = hojeISO(hojeRef);

  const [clientesRaw, contentsRaw, demandasRaw] = await Promise.all([
    listarClientes({ status: "ativos" }),
    listContents({}, { excluirCapas: true }),
    listDemandsFeitas(de, ate),
  ]);

  const clientes: RelCliente[] = clientesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
  }));

  const publicados: RelContent[] = contentsRaw
    .filter((c) => c.status === "Publicado")
    .map((c) => ({
      id: c.id,
      title: c.title,
      client_id: c.client_id,
      data: c.actual_post_date ?? c.planned_date ?? null,
    }));

  const gravados: RelContent[] = contentsRaw
    .filter(
      (c) =>
        !!c.recording_date && !ehArte(c.format) && estaGravado(c.status),
    )
    .map((c) => ({
      id: c.id,
      title: c.title,
      client_id: c.client_id,
      data: c.recording_date,
    }));

  const demandas: RelDemanda[] = demandasRaw.map((d) => ({
    id: d.id,
    title: d.title,
    client_id: d.client_id,
    category: d.category,
    dia: (d.updated_at ?? "").slice(0, 10),
  }));

  return (
    <>
      <PageHeader
        titulo="Relatórios"
        descricao="O que foi entregue na semana, por cliente. Pronto para copiar e enviar."
        icone="relatorios"
        tom="indigo"
      />
      <RelatoriosSemanais
        clientes={clientes}
        contents={publicados}
        gravados={gravados}
        demandas={demandas}
      />
    </>
  );
}
