import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Configurações — perfil do usuário e preferências do sistema.
 */
export default function ConfiguracoesPage() {
  return (
    <>
      <PageHeader titulo="Configurações" descricao="Perfil e preferências" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent>
            <h2 className="text-base font-semibold text-gray-900">Perfil</h2>
            <p className="mt-2 text-sm text-gray-500">
              Nome, e-mail e papel do usuário (a implementar).
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h2 className="text-base font-semibold text-gray-900">Sessão</h2>
            <p className="mt-2 text-sm text-gray-500">
              Encerrar sessão e segurança da conta (a implementar).
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
