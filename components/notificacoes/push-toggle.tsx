"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/ui/toast";
import {
  salvarInscricaoPushAction,
  removerInscricaoPushAction,
  enviarPushTesteAction,
} from "@/lib/actions/push";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** Converte a chave VAPID (base64url) para o formato que o navegador exige. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/**
 * Liga/desliga as notificações push DESTE aparelho. Mostra o estado, um botão
 * de ativar/desativar e um "enviar teste". No iPhone, só funciona com o app
 * adicionado à tela inicial (avisa quando não está).
 */
export function PushToggle() {
  const [suportado, setSuportado] = useState<boolean | null>(null);
  const [standalone, setStandalone] = useState(true);
  const [iOS, setIOS] = useState(false);
  const [inscrito, setInscrito] = useState(false);
  const [permissao, setPermissao] =
    useState<NotificationPermission>("default");
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    const temSuporte =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    const ehIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const sa =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    setIOS(ehIOS);
    setStandalone(sa);
    setSuportado(temSuporte);
    if (!temSuporte) return;

    setPermissao(Notification.permission);
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setInscrito(!!sub))
      .catch(() => {});
  }, []);

  async function ativar() {
    if (!VAPID_PUBLIC) {
      toast.erro("Notificações ainda não configuradas no servidor.");
      return;
    }
    setProcessando(true);
    try {
      const perm = await Notification.requestPermission();
      setPermissao(perm);
      if (perm !== "granted") {
        toast.erro("Permissão de notificação negada.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          VAPID_PUBLIC,
        ) as unknown as BufferSource,
      });
      const r = await salvarInscricaoPushAction({
        endpoint: sub.endpoint,
        subscription: sub.toJSON() as Record<string, unknown>,
        userAgent: navigator.userAgent,
      });
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível ativar.");
        return;
      }
      setInscrito(true);
      toast.sucesso("Notificações ativadas neste aparelho!");
    } catch {
      toast.erro("Não foi possível ativar as notificações.");
    } finally {
      setProcessando(false);
    }
  }

  async function desativar() {
    setProcessando(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removerInscricaoPushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setInscrito(false);
      toast.sucesso("Notificações desativadas neste aparelho.");
    } catch {
      toast.erro("Não foi possível desativar.");
    } finally {
      setProcessando(false);
    }
  }

  async function testar() {
    setProcessando(true);
    try {
      const r = await enviarPushTesteAction();
      if (!r.ok) toast.erro(r.error ?? "Não foi possível enviar o teste.");
      else toast.sucesso("Teste enviado! Deve chegar em instantes.");
    } finally {
      setProcessando(false);
    }
  }

  if (suportado === null) {
    return <p className="text-sm text-gray-400">Verificando…</p>;
  }

  if (!suportado) {
    return (
      <p className="text-sm text-gray-600">
        Este navegador não suporta notificações. Use o Chrome (Android) ou
        adicione o app à tela inicial no iPhone.
      </p>
    );
  }

  // iPhone só permite push com o app instalado na tela inicial.
  if (iOS && !standalone) {
    return (
      <div className="space-y-2 text-sm text-gray-600">
        <p>
          Para receber notificações no iPhone, você precisa abrir o favie pelo
          ícone na <strong>tela inicial</strong>.
        </p>
        <p className="text-xs text-gray-500">
          No Safari: toque em Compartilhar → “Adicionar à Tela de Início”. Depois
          abra pelo ícone e ative aqui.
        </p>
      </div>
    );
  }

  if (permissao === "denied") {
    return (
      <p className="text-sm text-gray-600">
        As notificações estão bloqueadas nas configurações do navegador/aparelho
        para este site. Libere lá e recarregue para ativar.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        {inscrito
          ? "Notificações ativas neste aparelho. Você recebe avisos de gravações, prazos e demandas."
          : "Ative para receber avisos de gravações, prazos e demandas direto no aparelho, mesmo com o favie fechado."}
      </p>
      <div className="flex flex-wrap gap-2">
        {inscrito ? (
          <>
            <Button variante="secundaria" onClick={desativar} disabled={processando}>
              Desativar
            </Button>
            <Button onClick={testar} disabled={processando}>
              Enviar teste
            </Button>
          </>
        ) : (
          <Button onClick={ativar} disabled={processando}>
            Ativar notificações
          </Button>
        )}
      </div>
    </div>
  );
}
