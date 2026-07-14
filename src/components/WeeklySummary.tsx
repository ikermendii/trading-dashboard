"use client";

import { AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import type { SummaryResponse, BotSummary } from "@/lib/types";

const fmt = (n: number) => Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
const money = (n: number) => `${n >= 0 ? "+" : "−"}$${fmt(n)}`;
const pct = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}%`;
const col = (n: number) => (n > 0 ? "text-emerald-500" : n < 0 ? "text-red-500" : "text-gray-500 dark:text-zinc-400");

const DOT: Record<string, string> = { hybrid: "bg-sky-500", mcp: "bg-violet-500" };

function Seg({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500 dark:text-zinc-400">{label}</span>
      <span className={`tabular-nums font-medium ${col(value)}`}>{money(value)}</span>
    </div>
  );
}

function BotCard({ b }: { b: BotSummary }) {
  if (b.error) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full ${DOT[b.id] ?? "bg-gray-400"}`} />
          <span className="font-semibold text-gray-900 dark:text-white">{b.name}</span>
        </div>
        <div className="text-sm text-red-500 flex items-center gap-1.5">
          <AlertTriangle size={14} /> No se pudo reconciliar: {b.error}
        </div>
      </div>
    );
  }
  const glitch = Math.abs(b.rawEquity - b.reconciledEquity) > Math.max(500, b.funding * 0.02);
  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${DOT[b.id] ?? "bg-gray-400"}`} />
          <span className="font-semibold text-gray-900 dark:text-white">{b.name}</span>
        </div>
        {b.unprotected.length === 0 ? (
          <span className="flex items-center gap-1 text-xs text-emerald-500"><ShieldCheck size={13} /> stops OK</span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-amber-500"><ShieldAlert size={13} /> {b.unprotected.length} sin stop</span>
        )}
      </div>

      {/* equity real + P&L total */}
      <div>
        <div className="text-xs text-gray-500 dark:text-zinc-500 uppercase tracking-wider font-medium">Valor real (reconciliado)</div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white">${fmt(b.reconciledEquity)}</span>
          <span className={`text-sm font-semibold tabular-nums ${col(b.totalPnl)}`}>{money(b.totalPnl)} ({pct(b.totalPnlPct)})</span>
        </div>
        {glitch && (
          <div className="mt-1 flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-500">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>Alpaca muestra ${fmt(b.rawEquity)} (glitch de snapshot). El valor real es el reconciliado por caja.</span>
          </div>
        )}
      </div>

      {/* segmentos */}
      <div className="border-t border-gray-100 dark:border-zinc-800 pt-2 flex flex-col gap-1.5">
        <Seg label="Acciones · largo" value={b.stockLong} />
        <Seg label="Acciones · corto" value={b.stockShort} />
        <Seg label="Crypto" value={b.cryptoPnl} />
        {b.fees < -1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-zinc-400">Comisiones</span>
            <span className="tabular-nums font-medium text-gray-500 dark:text-zinc-400">−${fmt(b.fees)}</span>
          </div>
        )}
      </div>

      {/* progreso reciente */}
      <div className="border-t border-gray-100 dark:border-zinc-800 pt-2 grid grid-cols-2 gap-2">
        <div>
          <div className="text-xs text-gray-500 dark:text-zinc-500 uppercase tracking-wider">Realizado 7d</div>
          <div className={`text-lg font-bold tabular-nums ${col(b.realized7d)}`}>{money(b.realized7d)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-zinc-500 uppercase tracking-wider">Realizado 30d</div>
          <div className={`text-lg font-bold tabular-nums ${col(b.realized30d)}`}>{money(b.realized30d)}</div>
        </div>
      </div>

      {/* footer */}
      <div className="text-xs text-gray-400 dark:text-zinc-600 tabular-nums">
        {b.openPositions} posición(es) · último trade {b.lastFillTime ? new Date(b.lastFillTime).toLocaleDateString("es-ES") : "—"}
      </div>
    </div>
  );
}

export function WeeklySummary({ data }: { data: SummaryResponse | null }) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Resumen semanal · valor real reconciliado</h2>
        {data && (
          <span className="text-xs text-gray-400 dark:text-zinc-600 tabular-nums">
            {new Date(data.generatedAt).toLocaleString("es-ES")}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data
          ? data.bots.map((b) => <BotCard key={b.id} b={b} />)
          : [0, 1].map((i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 h-40 animate-pulse" />
            ))}
      </div>
      <p className="mt-1.5 text-xs text-gray-400 dark:text-zinc-600">
        Cifra fiable = financiación + ventas − compras − comisiones + posiciones abiertas. Ignora los saltos fantasma del <code>equity</code> de Alpaca paper.
      </p>
    </section>
  );
}
