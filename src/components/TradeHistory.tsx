"use client";

import { format } from "date-fns";
import type { TradeActivity } from "@/lib/types";

interface Props {
  trades: TradeActivity[];
}

export function TradeHistory({ trades }: Props) {
  if (!trades.length) {
    return (
      <div className="text-center py-12 text-gray-400 dark:text-zinc-600 text-sm">
        Sin actividad reciente
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-zinc-800">
            {["Fecha", "Símbolo", "Operación", "Qty", "Precio", "Notional"].map(
              (h) => (
                <th
                  key={h}
                  className="pb-3 text-left text-xs text-gray-500 dark:text-zinc-500 uppercase tracking-wider font-medium px-2 first:pl-0"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr
              key={t.id}
              className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors"
            >
              <td className="py-2.5 pl-0 px-2 text-gray-400 dark:text-zinc-500 text-xs tabular-nums whitespace-nowrap">
                {format(new Date(t.timestamp), "dd MMM HH:mm")}
              </td>
              <td className="py-2.5 px-2 font-semibold text-gray-900 dark:text-white">
                {t.symbol}
              </td>
              <td className="py-2.5 px-2">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    t.side === "buy"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                      : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                  }`}
                >
                  {t.side === "buy" ? "COMPRA" : "VENTA"}
                </span>
              </td>
              <td className="py-2.5 px-2 tabular-nums text-gray-500 dark:text-zinc-400">
                {parseFloat(String(t.qty)) % 1 === 0
                  ? t.qty
                  : Number(t.qty).toFixed(4)}
              </td>
              <td className="py-2.5 px-2 tabular-nums text-gray-700 dark:text-zinc-300">
                ${Number(t.price).toFixed(2)}
              </td>
              <td className="py-2.5 px-2 tabular-nums text-gray-500 dark:text-zinc-400">
                ${(Number(t.qty) * Number(t.price)).toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
