/* Service worker do favie — recebe as notificações push e abre o app ao tocar. */

self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch (e) {
    dados = { title: "favie", body: event.data ? event.data.text() : "" };
  }

  const titulo = dados.title || "favie";
  const opcoes = {
    body: dados.body || "",
    icon: "/appicon.png?size=192",
    badge: "/appicon.png?size=192",
    tag: dados.tag || undefined, // agrupa/atualiza notificações do mesmo tipo
    data: { url: dados.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(titulo, opcoes));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    (async () => {
      const janelas = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Se o app já estiver aberto, foca nele (e navega, se der).
      for (const janela of janelas) {
        if ("focus" in janela) {
          await janela.focus();
          if ("navigate" in janela) {
            try {
              await janela.navigate(destino);
            } catch (e) {
              /* ignora se não puder navegar */
            }
          }
          return;
        }
      }
      // Senão, abre uma nova janela.
      if (self.clients.openWindow) {
        await self.clients.openWindow(destino);
      }
    })(),
  );
});
