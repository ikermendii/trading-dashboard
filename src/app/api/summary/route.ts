import { NextResponse } from "next/server";
import { BOTS, BotId } from "@/lib/alpaca";
import { computeBotSummary } from "@/lib/summary";
import type { BotSummary, SummaryResponse } from "@/lib/types";

// Datos en tiempo de petición (nada cacheado): resumen reconciliado siempre fresco.
export const dynamic = "force-dynamic";

const ORDER: BotId[] = ["hybrid", "mcp"];

function errorSummary(id: BotId, err: unknown): BotSummary {
  return {
    id,
    name: BOTS[id].name,
    funding: BOTS[id].initialCapital,
    reconciledEquity: 0, rawEquity: 0, cashLog: 0, positionsMv: 0,
    totalPnl: 0, totalPnlPct: 0, fees: 0,
    cryptoPnl: 0, stockPnl: 0, stockLong: 0, stockShort: 0, cryptoLong: 0, cryptoShort: 0,
    realized7d: 0, realized30d: 0, openPositions: 0, unprotected: [], lastFillTime: null,
    error: String(err),
  };
}

export async function GET() {
  const bots = await Promise.all(
    ORDER.map(async (id) => {
      try {
        return await computeBotSummary(BOTS[id]);
      } catch (err) {
        console.error(`summary ${id}:`, err);
        return errorSummary(id, err);
      }
    })
  );
  const body: SummaryResponse = { generatedAt: new Date().toISOString(), bots };
  return NextResponse.json(body);
}
