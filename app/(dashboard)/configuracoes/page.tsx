import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/config/profile-form";
import { GoogleConnection } from "@/components/config/google-connection";
import { getAuthContext, displayName } from "@/lib/auth";
import { obterConexaoGoogle } from "@/lib/data/google";
import { signOutAction } from "@/lib/actions/auth";
import { ROLE_LABELS } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { google?: string };
}

/** Configurações — perfil do usuário, integrações e sessão. */
export default async function ConfiguracoesPage({ searchParams }: PageProps) {
  const ctx = await getAuthContext();
  const nome = displayName(ctx);
  const email = ctx.user?.email ?? "—";
  const papel = ctx.profile ? ROLE_LABELS[ctx.profile.role] : "—";
  const google = await obterConexaoGoogle();

  return (
    <>
      <PageHeader titulo="Configurações" descricao="Perfil e sessão" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Perfil</h2>
          <Card>
            <CardContent>
              <ProfileForm nomeInicial={nome} email={email} papel={papel} />
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Google Agenda
          </h2>
          <Card>
            <CardContent>
              <GoogleConnection
                conectado={google.conectado}
                email={google.email}
                aviso={searchParams.google}
              />
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Sessão</h2>
          <Card>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Você está conectado como <strong>{nome}</strong> ({email}).
              </p>
              <form action={signOutAction}>
                <Button type="submit" variante="secundaria">
                  Sair da conta
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
