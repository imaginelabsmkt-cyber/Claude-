import type { SVGProps } from "react";

/**
 * Ícones do sistema interno.
 *
 * Mesmo desenho do sistema de demandas da Favie: SVG inline, traço de
 * 1.75, viewBox 24, sem dependência externa. Os dois sistemas são
 * separados, mas a casa é a mesma — a marca não muda de um para o outro.
 */
const CAMINHOS: Record<string, string> = {
  inicio: "M4 5h6v6H4zM14 5h6v4h-6zM14 13h6v6h-6zM4 15h6v4H4z",
  relatorio: "M3 3v18h18M8 17V9M13 17V5M18 17v-6",
  comercial: "M3 4h18l-7 8v7l-4 2v-9z",
  financeiro:
    "M12 3v18M16 7.5C16 6.1 14.2 5 12 5S8 6.1 8 7.5 9.8 10 12 10s4 1.1 4 2.5-1.8 2.5-4 2.5-4-1.1-4-2.5",
  pessoas:
    "M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M23 20v-2a4 4 0 0 0-3-3.87M16 4.13a4 4 0 0 1 0 7.75",
  contabil:
    "M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM14 2v5h5M9 15l2 2 4-4",
  administrativo:
    "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  pessoal: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
  buscar: "M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
  sair: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
};

interface IconeProps extends SVGProps<SVGSVGElement> {
  nome: string;
}

/** Renderiza o ícone correspondente ao nome informado. */
export function Icone({ nome, ...props }: IconeProps) {
  const caminho = CAMINHOS[nome] ?? CAMINHOS.inicio;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={caminho} />
    </svg>
  );
}
