# Prévias visuais

Renderizam um componente real para um HTML estático, com o CSS do
projeto, para abrir no navegador e olhar antes de subir. Não são testes
e não entram no `npm test`.

```bash
SAIDA_DIR=/tmp/previa && mkdir -p "$SAIDA_DIR"

# 1. compila o CSS do projeto
npx tailwindcss -c tailwind.config.ts -i app/globals.css -o "$SAIDA_DIR/app.css"

# 2. gera o HTML (o app.css precisa estar na mesma pasta)
SAIDA="$SAIDA_DIR/inicio.html" \
SAIDA_MES="$SAIDA_DIR/mes.html" \
SAIDA_FIXOS="$SAIDA_DIR/fixos.html" \
SAIDA_FLUXO="$SAIDA_DIR/fluxo.html" \
SAIDA_LANCAMENTOS="$SAIDA_DIR/lancamentos.html" \
SAIDA_COMPONENTES="$SAIDA_DIR/componentes.html" \
SAIDA_RELATORIOS="$SAIDA_DIR/relatorios.html" \
npx vitest run -c vitest.render.config.ts

# 3. abrir o arquivo no navegador, em tela larga e em tela de celular
```

Olhar as duas larguras: o gráfico tem duas geometrias, uma abaixo de
640px e outra acima, e só a vista estreita mostra se o rótulo do mês
ainda cabe.
