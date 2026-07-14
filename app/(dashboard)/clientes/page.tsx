import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

/**
 * Clientes — cadastro e gestão dos clientes atendidos pela agência.
 */
export default function ClientesPage() {
  return (
    <>
      <PageHeader
        titulo="Clientes"
        descricao="Cadastro e gestão dos clientes da agência"
        acao={<Button disabled>Novo cliente</Button>}
      />
      <EmptyState
        titulo="Nenhum cliente cadastrado"
        descricao="O cadastro de clientes será implementado nas próximas etapas."
      />
    </>
  );
}
