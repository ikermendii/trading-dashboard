import { NextRequest, NextResponse } from "next/server";
import { BOTS, alpacaFetch, BotId } from "@/lib/alpaca";
import type { DashboardData, EquityPoint, TradeActivity } from "@/lib/types";

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

    const equityHistory: EquityPoint[] = (historyRaw.timestamp ?? []).map(
      (ts: number, i: number) => ({
        timestamp: ts * 1000,
        equity: historyRaw.equity[i] ?? 0,
        pnl: historyRaw.profit_loss[i] ?? 0,
        pnlPct: (historyRaw.profit_loss_pct[i] ?? 0) * 100,
      })
    );

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

    // FIFO buy-sell matching for win/loss stats
    const fills = activitiesRaw
      .filter((a) => a.type === "fill" || a.type === "partial_fill")
      .sort((a, b) => a.transaction_time.localeCompare(b.transaction_time));

    const buyQueues: Record<string, { price: number; qty: number }[]> = {};
    let wins = 0, losses = 0, totalWin = 0, totalLoss = 0;

    for (const f of fills) {
      const sym = f.symbol;
      const price = parseFloat(f.price);
      const qty = parseFloat(f.qty);
      if (!buyQueues[sym]) buyQueues[sym] = [];

      if (f.side === "buy") {
        buyQueues[sym].push({ price, qty });
      } else {
        let remaining = qty;
        while (remaining > 0 && buyQueues[sym].length > 0) {
          const buy = buyQueues[sym][0];
          const matched = Math.min(buy.qty, remaining);
          const pl = (price - buy.price) * matched;
          if (pl >= 0) { wins++; totalWin += pl; }
          else { losses++; totalLoss += Math.abs(pl); }
          buy.qty -= matched;
          remaining -= matched;
          if (buy.qty <= 0.0001) buyQueues[sym].shift();
        }
      }
    }

    const closingFills = fills.filter((a) => a.side === "sell");
    const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
    const profitFactor = totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? 999 : 0;

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
      },
      positions,
      equityHistory: equityHistory.filter((p) => p.equity > 0),
      recentTrades,
      stats: {
        totalTrades: closingFills.length,
        winRate,
        avgWin: wins > 0 ? totalWin / wins : 0,
        avgLoss: losses > 0 ? totalLoss / losses : 0,
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
}
