export interface AccountInfo {
  equity: number;
  cash: number;
  buyingPower: number;
  lastEquity: number;
  dailyPnl: number;
  dailyPnlPct: number;
  totalPnl: number;
  totalPnlPct: number;
}

export interface Position {
  symbol: string;
  side: "long" | "short";
  qty: number;
  avgEntry: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPl: number;
  unrealizedPlPct: number;
  costBasis: number;
}

export interface EquityPoint {
  timestamp: number;
  equity: number;
  pnl: number;
  pnlPct: number;
}

export interface TradeActivity {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  price: number;
  timestamp: string;
  type: string;
}

export interface DashboardData {
  account: AccountInfo;
  positions: Position[];
  equityHistory: EquityPoint[];
  recentTrades: TradeActivity[];
  stats: BotStats;
}

export interface BotStats {
  totalTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  openPositions: number;
  maxPositions: number;
}
