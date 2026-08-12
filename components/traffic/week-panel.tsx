"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import {
  cancelarCobrancaAction,
  enviarCobrancaAction,
  enviarPendentesAction,
  gerarCobrancasAction,
  marcarPagaAction,
  salvarPixAction,
} from "@/lib/actions/traffic";
import { formatarData, formatarMoeda, formatarWhatsapp } from "@/lib/utils";
import { CHARGE_STATUS_TONE, type TrafficChargeWithClient } from "@/types";
import type { ResumoSemana } from "@/lib/rules/traffic";

interface WeekPanelProps {
  semana: string;
  semanas: string[];
  charges: TrafficChargeWithClient[];
  resumo: ResumoSemana;
  simulacao: boolean;
}

type Mensagem = { tipo: "sucesso" | "erro" | "info"; texto: string } | null;

export function WeekPanel({
  semana,
  semanas,
  charges,
  resumo,
  simulacao,
}: WeekPanelProps) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  // Rascunho do Pix por cobrança (permite colar antes de salvar/enviar).
  const [pixMap, setPixMap] = useState<Record<string, string>>({});

  // Sincroniza os rascunhos de Pix quando os dados chegam/atualizam.
  useEffect(() => {
    setPixMap((atual) => {
      const novo: Record<string, string> = {};
      for (const c of charges) novo[c.id] = atual[c.id] ?? c.pix_code ?? "";
      return novo;
    });
  }, [charges]);

  function executar(fn: () => Promise<Mensagem>) {
    iniciar(async () => {
      const msg = await fn();
      setMensagem(msg);
      router.refresh();
    });
  }

  function trocarSemana(nova: string) {
    router.push(`/trafego?semana=${nova}`);
  }

  const semanaLabel = useMemo(() => formatarData(semana), [semana]);

  return (
    <div className="space-y-5">
      {simulacao ? (
        <Alert variante="info">
          <strong>Modo de teste:</strong> o WhatsApp ainda não está conectado,
          então nada é enviado de verdade. O fluxo (status, lembretes) funciona
          normalmente para você testar. Conecte seu número nas configurações do
          servidor para ativar o envio real.
        </Alert>
      ) : null}

      {mensagem ? (
        <Alert
          variante={
            mensagem.tipo === "sucesso"
              ? "sucesso"
              : mensagem.tipo === "erro"
                ? "erro"
                : "info"
          }
        >
          {mensagem.texto}
        </Alert>
      ) : null}

      {/* Barra de semana + ações principais */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <span className="shrink-0">Semana de</span>
          <Select
            value={semana}
            onChange={(e) => trocarSemana(e.target.value)}
            className="w-auto"
          >
            {semanas.map((s) => (
              <option key={s} value={s}>
                {formatarData(s)}
              </option>
            ))}
          </Select>
        </label>

        <div className="flex flex-wrap gap-2">
          <Button
            variante="secundaria"
            disabled={processando}
            onClick={() =>
              executar(async () => {
                const r = await gerarCobrancasAction(semana);
                if (!r.ok) return { tipo: "erro", texto: r.error ?? "Erro." };
                if (r.error) return { tipo: "info", texto: r.error };
                return {
                  tipo: "sucesso",
                  texto:
                    r.criadas === 0
                      ? "Nenhuma cobrança nova (as da semana já existem)."
                      : `${r.criadas} cobrança(s) gerada(s) para a semana.`,
                };
              })
            }
          >
            Gerar cobranças da semana
          </Button>
          <Button
            disabled={processando}
            onClick={() =>
              executar(async () => {
                const r = await enviarPendentesAction(semana);
                if (!r.ok || !r.resumo)
                  return { tipo: "erro", texto: r.error ?? "Erro ao enviar." };
                const { enviadas, falhas, simuladas } = r.resumo;
                const parte = simuladas
                  ? ` (${simuladas} em modo teste)`
                  : "";
                return {
                  tipo: falhas ? "info" : "sucesso",
                  texto: `${enviadas} enviada(s)${parte}. ${falhas} falha(s).`,
                };
              })
            }
          >
            Enviar pendentes
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard rotulo="Cobranças" valor={String(resumo.total)} />
        <StatCard rotulo="Pagas" valor={String(resumo.pagas)} tom="verde" />
        <StatCard
          rotulo="Atrasadas"
          valor={String(resumo.atrasadas)}
          tom={resumo.atrasadas ? "vermelho" : undefined}
        />
        <StatCard rotulo="Em aberto" valor={formatarMoeda(resumo.valorEmAberto)} />
        <StatCard
          rotulo="Recebido"
          valor={formatarMoeda(resumo.valorRecebido)}
          tom="verde"
        />
      </div>

      {/* Lista de cobranças */}
      {charges.length === 0 ? (
        <EmptyState
          titulo="Nenhuma cobrança nesta semana"
          descricao={`Clique em "Gerar cobranças da semana" para criar as cobranças da semana de ${semanaLabel} com base nos clientes marcados para tráfego.`}
        />
      ) : (
        <div className="space-y-3">
          {charges.map((c) => (
            <ChargeCard
              key={c.id}
              charge={c}
              pix={pixMap[c.id] ?? ""}
              disabled={processando}
              onPixChange={(v) => setPixMap((m) => ({ ...m, [c.id]: v }))}
              onSalvarPix={() =>
                executar(async () => {
                  const r = await salvarPixAction(c.id, pixMap[c.id] ?? "");
                  return r.ok
                    ? { tipo: "sucesso", texto: "Código Pix salvo." }
                    : { tipo: "erro", texto: r.error ?? "Erro." };
                })
              }
              onEnviar={() =>
                executar(async () => {
                  // Garante que o Pix digitado seja salvo antes de enviar.
                  await salvarPixAction(c.id, pixMap[c.id] ?? "");
                  const r = await enviarCobrancaAction(c.id);
                  if (!r.ok)
                    return { tipo: "erro", texto: r.error ?? "Erro ao enviar." };
                  return {
                    tipo: "sucesso",
                    texto: r.simulado
                      ? `Enviado para ${c.client?.name} (modo teste).`
                      : `Enviado para ${c.client?.name}.`,
                  };
                })
              }
              onMarcarPaga={(paga) =>
                executar(async () => {
                  const r = await marcarPagaAction(c.id, paga);
                  return r.ok
                    ? {
                        tipo: "sucesso",
                        texto: paga
                          ? "Cobrança marcada como paga."
                          : "Marcação de pagamento desfeita.",
                      }
                    : { tipo: "erro", texto: r.error ?? "Erro." };
                })
              }
              onCancelar={() =>
                executar(async () => {
                  const r = await cancelarCobrancaAction(c.id);
                  return r.ok
                    ? { tipo: "sucesso", texto: "Cobrança cancelada." }
                    : { tipo: "erro", texto: r.error ?? "Erro." };
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  rotulo,
  valor,
  tom,
}: {
  rotulo: string;
  valor: string;
  tom?: "verde" | "vermelho";
}) {
  const cor =
    tom === "verde"
      ? "text-green-700"
      : tom === "vermelho"
        ? "text-red-700"
        : "text-gray-900";
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{rotulo}</p>
      <p className={`mt-1 text-lg font-semibold ${cor}`}>{valor}</p>
    </Card>
  );
}

interface ChargeCardProps {
  charge: TrafficChargeWithClient;
  pix: string;
  disabled: boolean;
  onPixChange: (v: string) => void;
  onSalvarPix: () => void;
  onEnviar: () => void;
  onMarcarPaga: (paga: boolean) => void;
  onCancelar: () => void;
}

function ChargeCard({
  charge,
  pix,
  disabled,
  onPixChange,
  onSalvarPix,
  onEnviar,
  onMarcarPaga,
  onCancelar,
}: ChargeCardProps) {
  const c = charge;
  const semWhatsapp = !c.client?.whatsapp;
  const encerrada = c.status === "Pago" || c.status === "Cancelado";
  const podeEnviar = !encerrada && !semWhatsapp && Boolean(pix.trim());

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-gray-900">
              {c.client?.name ?? "Cliente removido"}
            </span>
            <Badge tom={CHARGE_STATUS_TONE[c.status]}>{c.status}</Badge>
            {c.atrasada ? <Badge tom="vermelho">Atrasada</Badge> : null}
            {c.reminder_count > 0 ? (
              <Badge tom="amarelo">
                {c.reminder_count} lembrete{c.reminder_count > 1 ? "s" : ""}
              </Badge>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>
              WhatsApp:{" "}
              {semWhatsapp ? (
                <span className="text-red-600">não cadastrado</span>
              ) : (
                formatarWhatsapp(c.client?.whatsapp)
              )}
            </span>
            <span>Vencimento: {formatarData(c.due_date)}</span>
            {c.sent_at ? <span>Enviada ✓</span> : null}
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-gray-900">
            {formatarMoeda(Number(c.amount))}
          </p>
        </div>
      </div>

      {/* Pix */}
      {!encerrada ? (
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Código Pix (cole o que você gerou no Facebook)
          </label>
          <Textarea
            rows={2}
            value={pix}
            disabled={disabled}
            onChange={(e) => onPixChange(e.target.value)}
            placeholder="Cole aqui o Pix copia-e-cola desta semana"
            className="font-mono text-xs"
          />
        </div>
      ) : c.pix_code ? (
        <p className="mt-3 break-all rounded-lg bg-gray-50 p-2 font-mono text-xs text-gray-500">
          {c.pix_code}
        </p>
      ) : null}

      {c.send_error ? (
        <p className="mt-2 text-xs text-red-600">
          Último erro de envio: {c.send_error}
        </p>
      ) : null}

      {/* Ações */}
      <div className="mt-3 flex flex-wrap gap-2">
        {!encerrada ? (
          <>
            <Button
              tamanho="sm"
              variante="secundaria"
              disabled={disabled}
              onClick={onSalvarPix}
            >
              Salvar Pix
            </Button>
            <Button
              tamanho="sm"
              disabled={disabled || !podeEnviar}
              onClick={onEnviar}
              title={
                semWhatsapp
                  ? "Cadastre o WhatsApp do cliente"
                  : !pix.trim()
                    ? "Cole o código Pix"
                    : undefined
              }
            >
              {c.status === "Enviado" ? "Reenviar" : "Enviar"}
            </Button>
          </>
        ) : null}

        {c.status === "Pago" ? (
          <Button
            tamanho="sm"
            variante="secundaria"
            disabled={disabled}
            onClick={() => onMarcarPaga(false)}
          >
            Desfazer pago
          </Button>
        ) : c.status !== "Cancelado" ? (
          <Button
            tamanho="sm"
            variante="secundaria"
            disabled={disabled}
            onClick={() => onMarcarPaga(true)}
          >
            Marcar como pago
          </Button>
        ) : null}

        {!encerrada ? (
          <Button
            tamanho="sm"
            variante="fantasma"
            disabled={disabled}
            onClick={onCancelar}
          >
            Cancelar
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
