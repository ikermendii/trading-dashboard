"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Activity,
  BarChart2,
  RefreshCw,
  ChevronDown,
  CircleDot,
  Target,
  Award,
  Sun,
  Moon,
  Download,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import { MetricCard } from "@/components/MetricCard";
import { EquityCurve } from "@/components/EquityCurve";
import { PositionsTable } from "@/components/PositionsTable";
import { ClosedTrades } from "@/components/ClosedTrades";
import { PnLBar, type PnlView } from "@/components/PnLBar";
import type { DashboardData } from "@/lib/types";
import type { BotId } from "@/lib/alpaca";

type Period = "1M" | "3M" | "6M" | "1Y" | "ALL";
type Tab = "positions" | "trades";

const BOTS = [
  {
    id: "mcp" as BotId,
    name: "Bot MCP",
    description: "CrewAI · Claude Sonnet",
    color: "from-violet-600 to-violet-800",
    dot: "bg-violet-500",
  },
  {
    id: "hybrid" as BotId,
    name: "Bot Hybrid",
    description: "Quant · DeepSeek veto",
    color: "from-sky-600 to-sky-800",
    dot: "bg-sky-500",
  },
];

const PERIODS: Period[] = ["1M", "3M", "6M", "1Y", "ALL"];
const PNL_VIEWS: { id: PnlView; label: string }[] = [
  { id: "daily",   label: "Diario" },
  { id: "monthly", label: "Mensual" },
  { id: "yearly",  label: "Anual" },
];

function fmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function money(n: number) {
  return `${n >= 0 ? "+" : "-"}$${fmt(Math.abs(n))}`;
}

function exportCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv, ""], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const [botId, setBotId] = useState<BotId>("mcp");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("positions");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [period, setPeriod] = useState<Period>("3M");
  const [pnlView, setPnlView] = useState<PnlView>("daily");
  const [isDark, setIsDark] = useState(true);

  const selectedBot = BOTS.find((b) => b.id === botId)!;

  // Persist theme preference
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) setIsDark(saved === "dark");
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const load = useCallback(
    async (id: BotId) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/dashboard?bot=${id}&period=${period}`);
        if (!res.ok) throw new Error(await res.text());
        setData(await res.json());
        setLastUpdate(new Date());
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    [period]
  );

  useEffect(() => {
    load(botId);
    const iv = setInterval(() => load(botId), 60_000);
    return () => clearInterval(iv);
  }, [botId, load]);

  const switchBot = (id: BotId) => {
    setBotId(id);
    setDropdownOpen(false);
    setData(null);
    load(id);
  };

  const exportPositions = () => {
    if (!data) return;
    exportCSV(
      `positions_${botId}_${format(new Date(), "yyyy-MM-dd")}.csv`,
      ["Symbol", "Side", "Qty", "Entry Price", "Current Price", "Market Value", "P&L $", "P&L %"],
      data.positions.map((p) => [
        p.symbol, p.side, String(p.qty),
        p.avgEntry.toFixed(2), p.currentPrice.toFixed(2),
        p.marketValue.toFixed(0), p.unrealizedPl.toFixed(2),
        p.unrealizedPlPct.toFixed(2),
      ])
    );
  };

  const exportTrades = () => {
    if (!data) return;
    exportCSV(
      `closed_trades_${botId}_${format(new Date(), "yyyy-MM-dd")}.csv`,
      ["Exit Date", "Entry Date", "Symbol", "Direction", "Qty", "Entry Price", "Exit Price", "Realized P&L $", "Realized P&L %", "Commission"],
      data.closedTrades.map((t) => [
        format(new Date(t.exitTime), "yyyy-MM-dd HH:mm"),
        format(new Date(t.entryTime), "yyyy-MM-dd HH:mm"),
        t.symbol, t.side, String(t.qty),
        t.entryPrice.toFixed(4), t.exitPrice.toFixed(4),
        t.realizedPl.toFixed(2), t.realizedPlPct.toFixed(2),
        t.commission.toFixed(2),
      ])
    );
  };

  const exportEquity = () => {
    if (!data) return;
    exportCSV(
      `equity_${botId}_${period}_${format(new Date(), "yyyy-MM-dd")}.csv`,
      ["Date", "Equity", "Daily P&L", "Daily P&L %"],
      data.equityHistory.map((pt) => [
        format(new Date(pt.timestamp), "yyyy-MM-dd"),
        pt.equity.toFixed(2),
        pt.pnl.toFixed(2),
        pt.pnlPct.toFixed(4),
      ])
    );
  };

  const acc = data?.account;
  const stats = data?.stats;
  const isUp = (acc?.totalPnl ?? 0) >= 0;

  // Period selector pill shared style
  const pillBase = "px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer";
  const pillActive = "bg-violet-600 text-white";
  const pillInactive = "text-gray-500 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-700 dark:hover:text-zinc-300";

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 font-sans transition-colors">

        {/* Header */}
        <header className="border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-20 bg-white/95 dark:bg-zinc-950/95 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center">
                <BarChart2 size={14} className="text-white" />
              </div>
              <span className="font-bold text-sm tracking-tight hidden sm:block text-gray-900 dark:text-zinc-100">
                Trading Dashboard
              </span>
            </div>

            {/* Bot Selector */}
            <div className="relative ml-2">
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r ${selectedBot.color} text-white text-sm font-medium hover:opacity-90 transition-opacity`}
              >
                <span className={`w-2 h-2 rounded-full ${selectedBot.dot} animate-pulse`} />
                {selectedBot.name}
                <ChevronDown size={13} className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute left-0 mt-2 w-52 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-30">
                  {BOTS.map((bot) => (
                    <button
                      key={bot.id}
                      onClick={() => switchBot(bot.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        bot.id === botId
                          ? "bg-gray-100 dark:bg-zinc-800"
                          : "hover:bg-gray-50 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${bot.dot} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{bot.name}</div>
                        <div className="text-xs text-gray-400 dark:text-zinc-500 truncate">{bot.description}</div>
                      </div>
                      {bot.id === botId && <CircleDot size={13} className="text-gray-400 dark:text-zinc-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {lastUpdate && (
                <span className="text-xs text-gray-400 dark:text-zinc-600 hidden sm:block tabular-nums">
                  {lastUpdate.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={() => load(botId)}
                disabled={loading}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 text-gray-600 dark:text-zinc-400"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-gray-600 dark:text-zinc-400"
                title={isDark ? "Modo claro" : "Modo oscuro"}
              >
                {isDark ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-4 text-sm">
              Error cargando datos: {error}
            </div>
          )}

          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              label="Equity"
              value={acc ? `$${fmt(acc.equity)}` : "—"}
              sub={acc ? `${money(acc.totalPnl)} (${acc.totalPnlPct >= 0 ? "+" : ""}${acc.totalPnlPct.toFixed(2)}%)` : undefined}
              positive={acc ? acc.totalPnl >= 0 : null}
              icon={<Wallet size={15} />}
              large
            />
            <MetricCard
              label="P&L hoy"
              value={acc ? money(acc.dailyPnl) : "—"}
              sub={acc ? `${acc.dailyPnlPct >= 0 ? "+" : ""}${acc.dailyPnlPct.toFixed(2)}% vs ayer` : undefined}
              positive={acc ? acc.dailyPnl >= 0 : null}
              icon={acc ? (acc.dailyPnl >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />) : undefined}
            />
            <MetricCard
              label="Buying Power"
              value={acc ? `$${fmt(acc.buyingPower)}` : "—"}
              sub={acc ? `Cash: $${fmt(acc.cash)}` : undefined}
              icon={<Activity size={15} />}
            />
            <MetricCard
              label="Posiciones"
              value={stats ? `${stats.openPositions}/${stats.maxPositions}` : "—"}
              sub={stats ? `Win rate: ${stats.winRate.toFixed(0)}%` : undefined}
              positive={stats ? stats.openPositions < stats.maxPositions : null}
              icon={<Target size={15} />}
            />
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              label="Win Rate"
              value={stats ? `${stats.winRate.toFixed(1)}%` : "—"}
              sub={stats ? `${stats.totalTrades} trades cerrados` : undefined}
              positive={stats ? stats.winRate >= 50 : null}
              icon={<Award size={15} />}
            />
            <MetricCard
              label="Profit Factor"
              value={stats && stats.profitFactor < 100 ? stats.profitFactor.toFixed(2) : "—"}
              positive={stats ? stats.profitFactor >= 1.5 : null}
            />
            <MetricCard
              label="Avg Win"
              value={stats && stats.avgWin > 0 ? `$${fmt(stats.avgWin)}` : "—"}
              sub={stats && stats.avgLoss > 0 ? `Avg loss: $${fmt(stats.avgLoss)}` : undefined}
              positive={stats && stats.avgWin > 0 && stats.avgLoss > 0 ? stats.avgWin > stats.avgLoss : null}
            />
            <MetricCard
              label="Apalancamiento"
              value={acc ? `${acc.grossExposure.toFixed(2)}x` : "—"}
              sub={
                acc
                  ? acc.marginMultiplier > 1
                    ? `Margen ${acc.marginMultiplier}x · exp. $${fmt(acc.longMarketValue + acc.shortMarketValue)}`
                    : "Sin apalancamiento"
                  : undefined
              }
              positive={acc ? acc.grossExposure <= 1.0 : null}
              icon={<Layers size={15} />}
            />
          </div>

          {/* Equity curve */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-sm text-gray-700 dark:text-zinc-300">Curva de Equity</h2>
                {/* Period selector */}
                <div className="flex gap-1">
                  {PERIODS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`${pillBase} ${period === p ? pillActive : pillInactive}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {acc && (
                  <span className={`text-sm font-medium tabular-nums ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {money(acc.totalPnl)} ({acc.totalPnlPct >= 0 ? "+" : ""}{acc.totalPnlPct.toFixed(2)}%)
                  </span>
                )}
                <button
                  onClick={exportEquity}
                  disabled={!data}
                  className="flex items-center gap-1 text-xs text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400 disabled:opacity-40 transition-colors"
                  title="Exportar equity CSV"
                >
                  <Download size={12} />
                  <span className="hidden sm:inline">CSV</span>
                </button>
              </div>
            </div>
            {loading && !data ? (
              <div className="h-64 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-gray-200 dark:border-zinc-700 border-t-gray-500 dark:border-t-zinc-400 rounded-full animate-spin" />
              </div>
            ) : (
              <EquityCurve data={data?.equityHistory ?? []} initialCapital={100000} isDark={isDark} />
            )}
          </div>

          {/* Daily P&L bars */}
          {data && data.equityHistory.length > 1 && (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-semibold text-sm text-gray-700 dark:text-zinc-300">P&L</h2>
                {/* P&L view selector */}
                <div className="flex gap-1">
                  {PNL_VIEWS.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setPnlView(id)}
                      className={`${pillBase} ${pnlView === id ? pillActive : pillInactive}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <PnLBar data={data.equityHistory} view={pnlView} isDark={isDark} />
            </div>
          )}

          {/* Positions / Trades tabs */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center border-b border-gray-200 dark:border-zinc-800">
              {([
                { id: "positions" as Tab, label: `Posiciones${stats ? ` (${stats.openPositions})` : ""}` },
                { id: "trades" as Tab, label: `Operaciones cerradas${data ? ` (${data.closedTrades.length})` : ""}` },
              ]).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`px-5 py-3 text-sm font-medium transition-colors ${
                    tab === id
                      ? "text-gray-900 dark:text-white border-b-2 border-violet-500"
                      : "text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={tab === "positions" ? exportPositions : exportTrades}
                disabled={!data}
                className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 disabled:opacity-40 transition-colors px-4 py-3"
                title={`Exportar ${tab === "positions" ? "posiciones" : "trades"} CSV`}
              >
                <Download size={12} />
                Exportar CSV
              </button>
            </div>
            <div className="p-5">
              {loading && !data ? (
                <div className="h-32 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-gray-200 dark:border-zinc-700 border-t-gray-500 dark:border-t-zinc-400 rounded-full animate-spin" />
                </div>
              ) : tab === "positions" ? (
                <PositionsTable positions={data?.positions ?? []} />
              ) : (
                <ClosedTrades
                  trades={data?.closedTrades ?? []}
                  marginMultiplier={acc?.marginMultiplier ?? 1}
                />
              )}
            </div>
          </div>

          <footer className="text-center text-xs text-gray-300 dark:text-zinc-700 pb-2">
            Auto-refresh 60s · Paper trading · {selectedBot.description}
          </footer>
        </main>
      </div>
    </div>
  );
}
