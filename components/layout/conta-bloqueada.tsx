import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

/**
 * O que a pessoa vê quando entrou, mas a conta ainda não foi liberada.
 *
 * Sem isto ela veria o sistema todo vazio — todas as listas em branco,
 * sem explicação — e pensaria que está quebrado. O banco já a impede de
 * ver qualquer dado; esta tela só diz por quê.
 */
export function ContaBloqueada({ email }: { email: string | null }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <span className="block text-3xl font-bold lowercase leading-none tracking-tight text-brand-600">
        favie
      </span>

      <h1 className="mt-8 text-xl font-bold text-gray-900">
        Sua conta ainda não foi liberada
      </h1>

      <p className="mt-3 text-sm text-gray-600">
        O acesso a este sistema é dado uma conta por vez. Entrar com
        {email ? ` ${email}` : " uma conta"} não basta — alguém de dentro precisa
        liberar.
      </p>

      <p className="mt-3 text-sm text-gray-600">
        Se você é da Favie e está vendo isto, peça para a Fran ou a Vitória
        liberarem seu acesso.
      </p>

      <form action={signOutAction} className="mt-8">
        <Button type="submit" variante="secundaria">
          Sair
        </Button>
      </form>
    </main>
  );
}
