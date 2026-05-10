export type BotId = "mcp" | "hybrid";

export interface BotConfig {
  id: BotId;
  name: string;
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  initialCapital: number;
  maxPositions: number;
  strategy: string;
}

export const BOTS: Record<BotId, BotConfig> = {
  mcp: {
    id: "mcp",
    name: "Bot MCP",
    apiKey: process.env.MCP_ALPACA_KEY ?? "",
    secretKey: process.env.MCP_ALPACA_SECRET ?? "",
    baseUrl: "https://paper-api.alpaca.markets",
    initialCapital: 100000,
    maxPositions: 8,
    strategy: "CrewAI multi-agent (Claude Sonnet)",
  },
  hybrid: {
    id: "hybrid",
    name: "Bot Hybrid",
    apiKey: process.env.HYBRID_ALPACA_KEY ?? "",
    secretKey: process.env.HYBRID_ALPACA_SECRET ?? "",
    baseUrl: "https://paper-api.alpaca.markets",
    initialCapital: 100000,
    maxPositions: 10,
    strategy: "Quant breakout + DeepSeek veto",
  },
};

export function getHeaders(bot: BotConfig) {
  return {
    "APCA-API-KEY-ID": bot.apiKey,
    "APCA-API-SECRET-KEY": bot.secretKey,
  };
}

export async function alpacaFetch<T>(
  bot: BotConfig,
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${bot.baseUrl}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), {
    headers: getHeaders(bot),
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`Alpaca ${path} → ${res.status}`);
  return res.json();
}
