"use client";

import type { Position } from "@/lib/types";

interface Props {
  positions: Position[];
}

function pct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}
function money(n: number) {
  return `${n >= 0 ? "+" : ""}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function PositionsTable({ positions }: Props) {
  const sorted = [...positions].sort(
    (a, b) => b.unrealizedPlPct - a.unrealizedPlPct
  );

  if (!sorted.length) {
    return (
      <div className="text-center py-12 text-gray-400 dark:text-zinc-600 text-sm">
        Sin posiciones abiertas
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-zinc-800">
            {["Símbolo", "Lado", "Qty", "Entrada", "Precio", "Valor", "P&L", "P&L %"].map(
              (h) => (
                <th
                  key={h}
                  className="pb-3 text-left text-xs text-gray-500 dark:text-zinc-500 uppercase tracking-wider font-medium first:pl-0 last:pr-0 px-2"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((pos) => {
            const up = pos.unrealizedPl >= 0;
            const barWidth = Math.min(Math.abs(pos.unrealizedPlPct) * 3, 100);
            return (
              <tr
                key={pos.symbol}
                className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors"
              >
                <td className="py-3 pl-0 px-2 font-semibold text-gray-900 dark:text-white">
                  {pos.symbol}
                </td>
                <td className="py-3 px-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      pos.side === "long"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                        : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                    }`}
                  >
                    {pos.side.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 px-2 tabular-nums text-gray-700 dark:text-zinc-300">
                  {pos.qty % 1 === 0 ? pos.qty : pos.qty.toFixed(4)}
                </td>
                <td className="py-3 px-2 tabular-nums text-gray-500 dark:text-zinc-400">
                  ${pos.avgEntry.toFixed(2)}
                </td>
                <td className="py-3 px-2 tabular-nums text-gray-700 dark:text-zinc-300">
                  ${pos.currentPrice.toFixed(2)}
                </td>
                <td className="py-3 px-2 tabular-nums text-gray-500 dark:text-zinc-400">
                  ${Math.abs(pos.marketValue).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </td>
                <td className={`py-3 px-2 tabular-nums font-medium ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {money(pos.unrealizedPl)}
                </td>
                <td className="py-3 pr-0 px-2">
                  <div className="flex items-center gap-2">
                    <span className={`tabular-nums font-medium w-16 ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {pct(pos.unrealizedPlPct)}
                    </span>
                    <div className="h-1.5 w-20 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden hidden sm:block">
                      <div
                        className={`h-full rounded-full ${up ? "bg-emerald-500" : "bg-red-500"}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
