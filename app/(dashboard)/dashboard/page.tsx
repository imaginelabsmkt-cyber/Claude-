import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

/** Indicadores exibidos no topo do dashboard (placeholders na Etapa 1). */
const INDICADORES = [
  { rotulo: "Conteúdos ativos", chave: "total" },
  { rotulo: "Em gravação", chave: "gravacao" },
  { rotulo: "Na fila de edição", chave: "edicao" },
  { rotulo: "Agendados", chave: "agendado" },
];

/**
 * Dashboard — visão geral da produção.
 * Estrutura pronta; os números virão do Supabase na etapa do Dashboard.
 */
export default function DashboardPage() {
  return (
    <>
      <PageHeader
        titulo="Dashboard"
        descricao="Visão geral da produção de conteúdo"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {INDICADORES.map((indicador) => (
          <Card key={indicador.chave}>
            <CardContent>
              <p className="text-sm text-gray-500">{indicador.rotulo}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">—</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent>
            <h2 className="text-base font-semibold text-gray-900">
              Próximas entregas
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Lista de conteúdos por prazo (a implementar).
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h2 className="text-base font-semibold text-gray-900">
              Atividade recente
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Últimas movimentações no pipeline (a implementar).
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
