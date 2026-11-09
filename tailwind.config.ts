import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ---------------------------------------------------------------
        // PAPEL E TINTA
        // ---------------------------------------------------------------
        // O sistema não é branco sobre cinza: é papel creme da marca com
        // tinta quente. "Branco" e "cinza" aqui estão REDEFINIDOS, então
        // todo `bg-white` e todo `text-gray-500` que já existem no código
        // ficam quentes sozinhos, sem tocar em 34 arquivos.
        //
        // Contraste conferido, não estimado (WCAG 2, sobre o cartão
        // #fffdf8 e sobre o papel #f3ede0):
        //   gray-900 16,3:1 e 14,2:1   texto principal
        //   gray-600  7,4:1 e  6,5:1   rótulos
        //   gray-500  5,4:1 e  4,7:1   texto de apoio (passa AA nos dois)
        //   gray-400  2,6:1            só para o que está apagado
        white: "#fffdf8",
        /** Fundo da página. Creme da Favie, puxado para o claro. */
        papel: "#f3ede0",
        gray: {
          50: "#faf6ef",
          100: "#f4eee5",
          200: "#e9e1d5",
          300: "#d6cabb",
          400: "#a99c92",
          500: "#73675f",
          600: "#5d524e",
          700: "#48403f",
          800: "#332c2e",
          900: "#231d20",
        },
        // Favie — vinho da marca (#6A2336) como cor principal, sobre fundo
        // claro. Tons do mais claro (fundos/badges) ao mais escuro (hover).
        brand: {
          50: "#faf1f3",
          100: "#f4dbe1",
          400: "#b06579",
          500: "#8f3b51",
          600: "#6a2336",
          700: "#501a29",
          800: "#3b0d1c",
        },
        // Acento suave da marca (lilás) para detalhes.
        lilas: {
          100: "#efe6f4",
          300: "#bea0cc",
          500: "#9a77ad",
        },
        // Sistema interno: a cor da ÁREA em que a tela está. O valor vem
        // de `--area`, trocado por `[data-area]` (ver globals.css), então
        // `text-area` / `bg-area-soft` / `border-area` seguem a área sozinhos.
        area: {
          DEFAULT: "var(--area)",
          soft: "var(--area-soft)",
        },
        // Alerta do sistema interno — nunca é cor de área. Significa
        // sempre "venceu ou está vencendo".
        alerta: {
          DEFAULT: "var(--alerta)",
          soft: "var(--alerta-soft)",
        },
        // ---------------------------------------------------------------
        // CORES DE ESTADO
        // ---------------------------------------------------------------
        // As famílias de fábrica do Tailwind são frias: desenhadas para
        // fundo branco e cinza azulado. Sobre papel creme elas brigam
        // com o fundo. Estão redefinidas aqui, puxadas para o quente,
        // pelo mesmo motivo de `white` e `gray`: o código inteiro já usa
        // `text-red-600` e `bg-green-50`, e assim tudo acompanha.
        //
        // Contraste de TEXTO conferido sobre o cartão #fffdf8 (WCAG 2):
        // red-600 5,9:1 · green-700 6,1:1 · blue-700 6,9:1 ·
        // amber-600 4,8:1 · orange-700 5,9:1. Todos passam AA.
        // green-600 fica em 4,3:1 e por isso só é usado como borda.
        red: {
          50: "#fcece7",
          100: "#fbdbd3",
          200: "#f3bfb3",
          600: "#b8301f",
          700: "#9a2819",
          800: "#7a2015",
        },
        green: {
          50: "#e9f3ed",
          100: "#d2e9dc",
          200: "#aed6c1",
          600: "#0f8a5f",
          700: "#0b6f4d",
          800: "#095a3e",
        },
        blue: {
          50: "#eaf0f7",
          100: "#dae4f1",
          200: "#bacfe6",
          700: "#1d5a9e",
          800: "#174a83",
        },
        amber: {
          100: "#fcebc6",
          600: "#9a6708",
          700: "#7d5307",
        },
        orange: {
          100: "#fce2cd",
          700: "#99500f",
        },
        // Creme da marca — acento quente para destaques pontuais.
        creme: {
          100: "#fff1c7",
          200: "#ffe8a6",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        // Cantos mais abertos: é o que tira o ar de planilha.
        xl: "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        // Sombra tingida de vinho, não de preto. Preto sobre creme
        // acinzenta o papel; o vinho afunda o cartão sem sujar a cor.
        sm: "0 1px 2px rgba(67,13,32,0.05)",
        DEFAULT:
          "0 1px 3px rgba(67,13,32,0.06), 0 1px 2px rgba(67,13,32,0.04)",
        md: "0 4px 12px -2px rgba(67,13,32,0.08), 0 2px 6px -2px rgba(67,13,32,0.05)",
        lg: "0 12px 30px -10px rgba(67,13,32,0.14), 0 4px 10px -4px rgba(67,13,32,0.06)",
        "2xl": "0 24px 60px -20px rgba(67,13,32,0.22)",
      },
    },
  },
  plugins: [],
};

export default config;
