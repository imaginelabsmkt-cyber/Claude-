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
        // Favie — vinho da marca (#6A2336) como cor principal, sobre fundo
        // claro. Tons do mais claro (fundos/badges) ao mais escuro (hover).
        brand: {
          50: "#faf1f3",
          100: "#f4dbe1",
          400: "#b06579",
          500: "#8f3b51",
          600: "#6a2336",
          700: "#501a29",
        },
        // Acento suave da marca (lilás) para detalhes.
        lilas: {
          100: "#efe6f4",
          300: "#bea0cc",
          500: "#9a77ad",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
