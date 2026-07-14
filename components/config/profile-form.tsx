"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { atualizarPerfilAction } from "@/lib/actions/profile";

interface ProfileFormProps {
  nomeInicial: string;
  email: string;
  papel: string;
}

/** Formulário de edição do próprio perfil (nome). E-mail e papel só leitura. */
export function ProfileForm({ nomeInicial, email, papel }: ProfileFormProps) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeInicial);
  const [msg, setMsg] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [salvando, iniciar] = useTransition();

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    iniciar(async () => {
      const r = await atualizarPerfilAction(nome);
      if (!r.ok) {
        setMsg({ tipo: "erro", texto: r.error ?? "Não foi possível salvar." });
        return;
      }
      setMsg({ tipo: "sucesso", texto: "Perfil atualizado." });
      router.refresh();
    });
  }

  return (
    <form onSubmit={enviar} className="max-w-md space-y-4">
      {msg ? (
        <Alert variante={msg.tipo === "sucesso" ? "sucesso" : "erro"}>
          {msg.texto}
        </Alert>
      ) : null}

      <div>
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" value={email} disabled />
        <p className="mt-1 text-xs text-gray-500">
          O e-mail é gerenciado pela autenticação e não pode ser alterado aqui.
        </p>
      </div>

      <div>
        <Label htmlFor="papel">Papel</Label>
        <Input id="papel" value={papel} disabled />
      </div>

      <Button type="submit" disabled={salvando}>
        {salvando ? "Salvando..." : "Salvar perfil"}
      </Button>
    </form>
  );
}
