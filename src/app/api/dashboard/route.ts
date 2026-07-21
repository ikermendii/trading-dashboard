import { NextRequest, NextResponse } from "next/server";
import { BOTS, alpacaFetch, BotId } from "@/lib/alpaca";
import type {
  DashboardData,
  EquityPoint,
  TradeActivity,
  ClosedTrade,
} from "@/lib/types";

type Period = "1M" | "3M" | "6M" | "1Y" | "ALL";

const PERIOD_MAP: Record<Period, { period: string; timeframe: string }> = {
  "1M":  { period: "1M",  timeframe: "1D" },
  "3M":  { period: "3M",  timeframe: "1D" },
  "6M":  { period: "6M",  timeframe: "1D" },
  "1Y":  { period: "12M", timeframe: "1D" },
  "ALL": { period: "5A",  timeframe: "1D" },
};

export async function GET(req: NextRequest) {
  const botId = (req.nextUrl.searchParams.get("bot") ?? "mcp") as BotId;
  const periodKey = (req.nextUrl.searchParams.get("period") ?? "3M") as Period;
  const bot = BOTS[botId];
  if (!bot) return NextResponse.json({ error: "Unknown bot" }, { status: 400 });

  const { period, timeframe } = PERIOD_MAP[periodKey] ?? PERIOD_MAP["3M"];

  try {
    const [account, positionsRaw, historyRaw, activitiesRaw] =
      await Promise.all([
        alpacaFetch<Record<string, string>>(bot, "/v2/account"),
        alpacaFetch<AlpacaPosition[]>(bot, "/v2/positions"),
        alpacaFetch<AlpacaHistory>(bot, "/v2/account/portfolio/history", {
          period,
          timeframe,
          extended_hours: "false",
        }),
        alpacaFetch<AlpacaActivity[]>(bot, "/v2/account/activities", {
          activity_types: "FILL",
          page_size: "100",
        }),
      ]);

    const equity = parseFloat(account.equity);
    const lastEquity = parseFloat(account.last_equity);
    const dailyPnl = equity - lastEquity;
    const totalPnl = equity - bot.initialCapital;

    // Apalancamiento global de la cuenta: exposición bruta / equity.
    const longMv = parseFloat(account.long_market_value ?? "0") || 0;
    const shortMv = Math.abs(parseFloat(account.short_market_value ?? "0")) || 0;
    const grossExposure = equity > 0 ? (longMv + shortMv) / equity : 0;
    const marginMultiplier = parseFloat(account.multiplier ?? "1") || 1;

    const equityHistory: EquityPoint[] = (historyRaw.timestamp ?? []).map(
      (ts: number, i: number) => ({
        timestamp: ts * 1000,
        equity: historyRaw.equity[i] ?? 0,
        pnl: historyRaw.profit_loss[i] ?? 0,
        pnlPct: (historyRaw.profit_loss_pct[i] ?? 0) * 100,
      })
    );

    // portfolio/history con timeframe 1D trae como último punto el cierre ANTERIOR
    // y no refleja el intradía: la curva se queda plana aunque la cuenta se haya
    // movido hoy (visto en Hybrid: history $93.466 vs cuenta real $101.954, +$8.5k
    // que no aparecían). Empalmamos el equity EN VIVO como punto final para que el
    // gráfico refleje la realidad. Si el último punto ya es de hoy, se sustituye;
    // si no, se añade uno nuevo "ahora".
    const nowMs = Date.now();
    const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
    const livePoint: EquityPoint = {
      timestamp: nowMs,
      equity,
      pnl: dailyPnl,
      pnlPct: lastEquity > 0 ? (dailyPnl / lastEquity) * 100 : 0,
    };
    const lastPt = equityHistory[equityHistory.length - 1];
    if (lastPt && utcDay(lastPt.timestamp) === utcDay(nowMs)) {
      equityHistory[equityHistory.length - 1] = livePoint;
    } else {
      equityHistory.push(livePoint);
    }

    const positions = positionsRaw.map((p) => ({
      symbol: p.symbol,
      side: p.side as "long" | "short",
      qty: Math.abs(parseFloat(p.qty)),
      avgEntry: parseFloat(p.avg_entry_price),
      currentPrice: parseFloat(p.current_price),
      marketValue: parseFloat(p.market_value),
      unrealizedPl: parseFloat(p.unrealized_pl),
      unrealizedPlPct: parseFloat(p.unrealized_plpc) * 100,
      costBasis: parseFloat(p.cost_basis),
    }));

    // ── FIFO matching → operaciones cerradas (round-trips) ──────────────────
    // Emparejamos entradas y salidas por símbolo en orden cronológico. Cada vez
    // que una salida consume entradas, emitimos un ClosedTrade con P&L realizado,
    // comisión y fechas. Soporta LONG (buy→sell) y SHORT (sell→buy).
    const fills = activitiesRaw
      .filter((a) => a.type === "fill" || a.type === "partial_fill")
      .sort((a, b) => a.transaction_time.localeCompare(b.transaction_time));

    // Cola de aperturas abiertas por símbolo. side = dirección de la apertura.
    type OpenLot = { price: number; qty: number; time: string; side: "long" | "short" };
    const openLots: Record<string, OpenLot[]> = {};
    const closedTrades: ClosedTrade[] = [];

    const feeOf = (a: AlpacaActivity) =>
      Math.abs(parseFloat(a.fee ?? a.commission ?? "0")) || 0;

    for (const f of fills) {
      const sym = f.symbol;
      const price = parseFloat(f.price);
      const qty = parseFloat(f.qty);
      const fee = feeOf(f);
      if (!openLots[sym]) openLots[sym] = [];
      const lots = openLots[sym];

      // ¿Esta fill ABRE o CIERRA? Abre si no hay lotes opuestos que consumir.
      const openSide: "long" | "short" = f.side === "buy" ? "long" : "short";
      const opposite = lots.length > 0 && lots[0].side !== openSide;

      if (!opposite) {
        // Apertura (o ampliación) en la misma dirección.
        lots.push({ price, qty, time: f.transaction_time, side: openSide });
        continue;
      }

      // Cierre: consume lotes opuestos en FIFO.
      let remaining = qty;
      while (remaining > 0 && lots.length > 0 && lots[0].side !== openSide) {
        const lot = lots[0];
        const matched = Math.min(lot.qty, remaining);
        // P&L: LONG = (salida-entrada); SHORT = (entrada-salida).
        const entryPrice = lot.price;
        const exitPrice = price;
        const grossPl =
          lot.side === "long"
            ? (exitPrice - entryPrice) * matched
            : (entryPrice - exitPrice) * matched;
        // Prorratea la comisión de esta fill por la fracción consumida.
        const tradeFee = fee * (matched / qty);
        const netPl = grossPl - tradeFee;
        const notional = entryPrice * matched;

        closedTrades.push({
          // groupKey: todas las piezas de la MISMA orden de salida comparten
          // order_id → se consolidan en una fila. Fallback al id de la fill.
          id: f.order_id ?? f.id,
          symbol: sym,
          side: lot.side,
          qty: matched,
          entryPrice,
          exitPrice,
          entryTime: lot.time,
          exitTime: f.transaction_time,
          realizedPl: netPl,
          realizedPlPct: notional > 0 ? (netPl / notional) * 100 : 0,
          commission: tradeFee,
          notional,
        });

        lot.qty -= matched;
        remaining -= matched;
        if (lot.qty <= 0.0001) lots.shift();
      }
      // Si tras cerrar todo queda cantidad, abre en la nueva dirección (flip).
      if (remaining > 0.0001) {
        lots.push({ price, qty: remaining, time: f.transaction_time, side: openSide });
      }
    }

    // Consolidar fragmentos del mismo round-trip. Una salida que se llena en
    // varios lotes (o contra varias entradas del mismo precio/instante) genera
    // múltiples ClosedTrade; los agrupamos por símbolo + entrada + salida en una
    // sola fila legible. Así "un cierre = un trade" y las métricas no se inflan.
    const mergedMap = new Map<string, ClosedTrade>();
    for (const t of closedTrades) {
      // Agrupa por orden de salida (t.id = order_id). Una orden de cierre llenada
      // en varios lotes / contra varias entradas = una sola fila.
      const key = t.id;
      const ex = mergedMap.get(key);
      if (!ex) {
        mergedMap.set(key, { ...t });
      } else {
        // qty ponderada para recalcular precios medios y sumar P&L/comisión.
        const totalQty = ex.qty + t.qty;
        ex.entryPrice = (ex.entryPrice * ex.qty + t.entryPrice * t.qty) / totalQty;
        ex.exitPrice = (ex.exitPrice * ex.qty + t.exitPrice * t.qty) / totalQty;
        ex.qty = totalQty;
        ex.realizedPl += t.realizedPl;
        ex.commission += t.commission;
        ex.notional += t.notional;
        ex.realizedPlPct = ex.notional > 0 ? (ex.realizedPl / ex.notional) * 100 : 0;
      }
    }
    const mergedTrades = Array.from(mergedMap.values()).sort((a, b) =>
      b.exitTime.localeCompare(a.exitTime)
    );

    // Recalcular win/loss sobre trades consolidados (un cierre = un trade).
    let mWins = 0, mLosses = 0, mTotalWin = 0, mTotalLoss = 0;
    for (const t of mergedTrades) {
      if (t.realizedPl >= 0) { mWins++; mTotalWin += t.realizedPl; }
      else { mLosses++; mTotalLoss += Math.abs(t.realizedPl); }
    }
    const winRate = mWins + mLosses > 0 ? (mWins / (mWins + mLosses)) * 100 : 0;
    const profitFactor = mTotalLoss > 0 ? mTotalWin / mTotalLoss : mTotalWin > 0 ? 999 : 0;

    const recentTrades: TradeActivity[] = activitiesRaw.slice(0, 50).map((a) => ({
      id: a.id,
      symbol: a.symbol,
      side: a.side as "buy" | "sell",
      qty: parseFloat(a.qty),
      price: parseFloat(a.price),
      timestamp: a.transaction_time,
      type: a.type,
    }));

    const data: DashboardData = {
      account: {
        equity,
        cash: parseFloat(account.cash),
        buyingPower: parseFloat(account.buying_power),
        lastEquity,
        dailyPnl,
        dailyPnlPct: lastEquity > 0 ? (dailyPnl / lastEquity) * 100 : 0,
        totalPnl,
        totalPnlPct: (totalPnl / bot.initialCapital) * 100,
        grossExposure,
        longMarketValue: longMv,
        shortMarketValue: shortMv,
        marginMultiplier,
      },
      positions,
      equityHistory: equityHistory.filter((p) => p.equity > 0),
      recentTrades,
      closedTrades: mergedTrades,
      stats: {
        totalTrades: mergedTrades.length,
        winRate,
        avgWin: mWins > 0 ? mTotalWin / mWins : 0,
        avgLoss: mLosses > 0 ? mTotalLoss / mLosses : 0,
        profitFactor,
        openPositions: positions.length,
        maxPositions: bot.maxPositions,
      },
    };

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

interface AlpacaPosition {
  symbol: string;
  side: string;
  qty: string;
  avg_entry_price: string;
  current_price: string;
  market_value: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  cost_basis: string;
}

interface AlpacaHistory {
  timestamp: number[];
  equity: number[];
  profit_loss: number[];
  profit_loss_pct: number[];
}

interface AlpacaActivity {
  id: string;
  symbol: string;
  side: string;
  qty: string;
  price: string;
  transaction_time: string;
  type: string;
  /** order_id agrupa todas las partial_fills de una misma orden. */
  order_id?: string;
  /** Alpaca paper trading no devuelve fees; presentes por compatibilidad live. */
  fee?: string;
  commission?: string;
}
