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

/**
 * Resumen reconciliado por aritmética de caja — la ÚNICA cifra fiable.
 * El campo `equity` de Alpaca paper sufre saltos fantasma (oculta posiciones,
 * cash erróneo); esto lo evita: reconciledEquity = funding + ventas − compras
 * − fees + valor de posiciones abiertas. Ver alpaca-paper-phantom-equity-artifact.
 */
export interface BotSummary {
  id: string;
  name: string;
  /** Capital inicial real (JNLC de financiación; fallback initialCapital). */
  funding: number;
  /** Equity real reconciliado (la cifra buena). */
  reconciledEquity: number;
  /** Equity que reporta Alpaca (puede glitchear). */
  rawEquity: number;
  cashLog: number;
  positionsMv: number;
  totalPnl: number;
  totalPnlPct: number;
  fees: number;
  /** P&L por segmento (realizado + no realizado de posiciones abiertas). */
  cryptoPnl: number;
  stockPnl: number;
  /** Realizado por dirección (FIFO sobre fills, símbolos normalizados). */
  stockLong: number;
  stockShort: number;
  cryptoLong: number;
  cryptoShort: number;
  /** Realizado en ventanas recientes (progreso). */
  realized7d: number;
  realized30d: number;
  openPositions: number;
  /** Símbolos de posiciones abiertas SIN stop protector. */
  unprotected: string[];
  lastFillTime: string | null;
  error?: string;
}

export interface SummaryResponse {
  generatedAt: string;
  bots: BotSummary[];
}
