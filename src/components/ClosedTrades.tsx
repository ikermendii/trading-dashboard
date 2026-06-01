"use client";

import { format } from "date-fns";
import type { ClosedTrade } from "@/lib/types";

interface Props {
  trades: ClosedTrade[];
  /** Multiplicador de margen de la cuenta: si es 1, no se usó apalancamiento. */
  marginMultiplier: number;
}

function num(n: number, max = 2) {
  return n.toLocaleString("en-US", { maximumFractionDigits: max });
}

export function ClosedTrades({ trades, marginMultiplier }: Props) {
  if (!trades.length) {
    return (
      <div className="text-center py-12 text-gray-400 dark:text-zinc-600 text-sm">
        Sin operaciones cerradas todavía
      </div>
    );
  }

  // La cuenta apalanca si el multiplicador > 1; si no, ocultamos esa columna.
  const showLeverage = marginMultiplier > 1;

  const headers = [
    "Cierre",
    "Símbolo",
    "Dir.",
    "Qty",
    "Entrada",
    "Salida",
    "P&L",
    "P&L %",
    "Comisión",
    ...(showLeverage ? ["Margen"] : []),
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-zinc-800">
            {headers.map((h) => (
              <th
                key={h}
                className="pb-3 text-left text-xs text-gray-500 dark:text-zinc-500 uppercase tracking-wider font-medium px-2 first:pl-0"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => {
            const win = t.realizedPl >= 0;
            const plColor = win
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400";
            // Una operación "usó margen" si su notional superó el equity-por-trade
            // disponible; como aproximación a nivel cuenta, marcamos con margen
            // cuando el multiplicador es 2x (la cuenta lo permite). Señal informativa.
            return (
              <tr
                key={t.id}
                className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors"
              >
                <td className="py-2.5 pl-0 px-2 text-gray-400 dark:text-zinc-500 text-xs tabular-nums whitespace-nowrap">
                  {format(new Date(t.exitTime), "dd MMM HH:mm")}
                </td>
                <td className="py-2.5 px-2 font-semibold text-gray-900 dark:text-white">
                  {t.symbol}
                </td>
                <td className="py-2.5 px-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      t.side === "long"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                    }`}
                  >
                    {t.side === "long" ? "LONG" : "SHORT"}
                  </span>
                </td>
                <td className="py-2.5 px-2 tabular-nums text-gray-500 dark:text-zinc-400">
                  {t.qty % 1 === 0 ? t.qty : num(t.qty, 4)}
                </td>
                <td className="py-2.5 px-2 tabular-nums text-gray-700 dark:text-zinc-300">
                  ${num(t.entryPrice)}
                </td>
                <td className="py-2.5 px-2 tabular-nums text-gray-700 dark:text-zinc-300">
                  ${num(t.exitPrice)}
                </td>
                <td className={`py-2.5 px-2 tabular-nums font-semibold ${plColor}`}>
                  {win ? "+" : "-"}${num(Math.abs(t.realizedPl))}
                </td>
                <td className={`py-2.5 px-2 tabular-nums font-medium ${plColor}`}>
                  {win ? "+" : ""}
                  {t.realizedPlPct.toFixed(2)}%
                </td>
                <td className="py-2.5 px-2 tabular-nums text-gray-400 dark:text-zinc-500">
                  {t.commission > 0 ? `$${num(t.commission)}` : "$0.00"}
                </td>
                {showLeverage && (
                  <td className="py-2.5 px-2 tabular-nums text-gray-400 dark:text-zinc-500 text-xs">
                    {marginMultiplier}x disp.
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-gray-400 dark:text-zinc-600">
        P&L realizado neto de comisiones. Alpaca paper trading es sin comisiones
        ($0.00).
        {showLeverage
          ? " La cuenta opera con margen disponible; el apalancamiento real se ve en la métrica de exposición."
          : " Esta cuenta no usa apalancamiento."}
      </p>
    </div>
  );
}
