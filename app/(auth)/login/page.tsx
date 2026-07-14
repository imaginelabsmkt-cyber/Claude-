import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Tela de Login (esqueleto).
 * A integração com Supabase Auth (e-mail/senha) será implementada na
 * etapa de autenticação. Por ora, apenas a estrutura visual.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white">
              A
            </div>
            <h1 className="text-xl font-bold text-gray-900">Agência Social</h1>
            <p className="mt-1 text-sm text-gray-500">
              Entre para gerenciar a produção de conteúdo
            </p>
          </div>

          <form className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                disabled
                placeholder="voce@agencia.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50"
              />
            </div>

            <div>
              <label
                htmlFor="senha"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Senha
              </label>
              <input
                id="senha"
                type="password"
                autoComplete="current-password"
                disabled
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50"
              />
            </div>

            <Button type="button" disabled className="w-full">
              Entrar (em breve)
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400">
            Autenticação será habilitada na próxima etapa.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
