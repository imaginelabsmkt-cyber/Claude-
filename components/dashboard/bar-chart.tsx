interface BarItem {
  label: string;
  value: number;
  cor?: string;
}

interface BarChartProps {
  dados: BarItem[];
}

/**
 * Gráfico de barras horizontais simples (sem dependências).
 * Acessível: cada barra expõe o valor como texto.
 */
export function BarChart({ dados }: BarChartProps) {
  const max = Math.max(1, ...dados.map((d) => d.value));
  if (dados.length === 0) {
    return <p className="text-sm text-gray-500">Sem dados.</p>;
  }
  return (
    <ul className="space-y-2">
      {dados.map((d) => (
        <li key={d.label} className="flex items-center gap-3 text-sm">
          <span className="w-40 shrink-0 truncate text-gray-600" title={d.label}>
            {d.label}
          </span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-gray-100">
            <div
              className="h-full rounded"
              style={{
                width: `${(d.value / max) * 100}%`,
                backgroundColor: d.cor ?? "#6a2336",
                minWidth: d.value > 0 ? "4px" : "0",
              }}
            />
          </div>
          <span className="w-8 shrink-0 text-right font-medium text-gray-700">
            {d.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
