export interface AccountInfo {
  equity: number;
  cash: number;
  buyingPower: number;
  lastEquity: number;
  dailyPnl: number;
  dailyPnlPct: number;
  totalPnl: number;
  totalPnlPct: number;
  /** Gross exposure (long+short market value) / equity. 1.0 = sin apalancamiento. */
  grossExposure: number;
  longMarketValue: number;
  shortMarketValue: number;
  /** Multiplicador de margen de la cuenta Alpaca (1 = cash, 2 = margen 2x). */
  marginMultiplier: number;
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

/** Operación cerrada (round-trip): emparejamiento FIFO de entrada(s) y salida(s). */
export interface ClosedTrade {
  id: string;
  symbol: string;
  /** Dirección de la operación que se cerró. */
  side: "long" | "short";
  qty: number;
  entryPrice: number;
  exitPrice: number;
  entryTime: string;
  exitTime: string;
  /** P&L realizado neto (tras comisiones) en USD. */
  realizedPl: number;
  /** P&L realizado en % sobre el coste de entrada. */
  realizedPlPct: number;
  /** Comisiones/fees totales aplicadas a este round-trip (0 en paper trading). */
  commission: number;
  /** Notional de entrada (qty × entryPrice). */
  notional: number;
}

export interface DashboardData {
  account: AccountInfo;
  positions: Position[];
  equityHistory: EquityPoint[];
  recentTrades: TradeActivity[];
  closedTrades: ClosedTrade[];
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
