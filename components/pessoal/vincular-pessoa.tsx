"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { vincularMeAPessoaAction } from "@/lib/actions/pessoal";
import { toast } from "@/lib/ui/toast";
import type { TeamMember } from "@/types";

/**
 * "Qual pessoa da equipe sou eu?" — pergunta uma vez, nunca mais.
 *
 * Com o vínculo feito, a aba pessoal mostra o pró-labore que a agência
 * pagou no mês, lendo o financeiro da empresa. Sem ele, dá para usar a
 * aba normalmente; só é preciso lançar a entrada à mão.
 *
 * O vínculo é de quem está logado para si mesma: o banco recusa
 * reivindicar a pessoa já ligada a outro login.
 */
export function VincularPessoa({ pessoas }: { pessoas: TeamMember[] }) {
  const router = useRouter();
  const [escolhida, setEscolhida] = useState("");
  const [processando, iniciar] = useTransition();

  if (pessoas.length === 0) return null;

  function vincular() {
    if (!escolhida) return;
    iniciar(async () => {
      const r = await vincularMeAPessoaAction(escolhida);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível vincular.");
        return;
      }
      toast.sucesso("Pronto — o pró-labore do mês já aparece aqui.");
      router.refresh();
    });
  }

  return (
    <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-gray-900">
        Qual pessoa da equipe é você?
      </p>
      <p className="mt-0.5 text-xs text-gray-500">
        Respondendo uma vez, o pró-labore que a agência te paga entra aqui
        sozinho todo mês, em vez de você digitar.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select
          value={escolhida}
          onChange={(e) => setEscolhida(e.target.value)}
          className="w-auto min-w-[12rem]"
          aria-label="Pessoa da equipe"
        >
          <option value="">Escolher...</option>
          {pessoas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Button onClick={vincular} disabled={!escolhida || processando}>
          {processando ? "Vinculando..." : "Sou eu"}
        </Button>
      </div>
    </div>
  );
}
