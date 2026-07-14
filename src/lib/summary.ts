import { BotConfig, alpacaFetch } from "@/lib/alpaca";
import type { BotSummary } from "@/lib/types";

// Reconciliación por aritmética de caja (equivalente a reconcile.py + seg.py del bot).
// Es la ÚNICA cifra fiable: el `equity` de Alpaca paper glitchea (oculta posiciones,
// cash erróneo). reconciledEquity = funding + ventas − compras − fees + posiciones MV.

interface Activity {
  activity_type?: string;
  symbol?: string;
  side?: string;
  qty?: string;
  price?: string;
  net_amount?: string;
  transaction_time?: string;
  id?: string;
}
interface Position { symbol: string; side: string; market_value: string }
interface Order { symbol: string; type: string; legs?: Order[] }

const norm = (s: string) => (s || "").replace(/\//g, "").toUpperCase();
const isCrypto = (s: string) => (s || "").includes("/") || norm(s).endsWith("USD");
const num = (s?: string) => parseFloat(s ?? "0") || 0;

async function pageActivities(bot: BotConfig, types: string): Promise<Activity[]> {
  const out: Activity[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < 40; i++) {
    const params: Record<string, string> = {
      activity_types: types,
      page_size: "100",
      direction: "desc",
    };
    if (pageToken) params.page_token = pageToken;
    const batch = await alpacaFetch<Activity[]>(bot, "/v2/account/activities", params);
    if (!batch || batch.length === 0) break;
    out.push(...batch);
    if (batch.length < 100) break;
    pageToken = batch[batch.length - 1].id;
  }
  return out;
}

export async function computeBotSummary(bot: BotConfig): Promise<BotSummary> {
  const [account, positions, fills, nonFill, openOrders] = await Promise.all([
    alpacaFetch<Record<string, string>>(bot, "/v2/account"),
    alpacaFetch<Position[]>(bot, "/v2/positions"),
    pageActivities(bot, "FILL"),
    pageActivities(bot, "JNLC,FEE,CFEE"),
    alpacaFetch<Order[]>(bot, "/v2/orders", { status: "open", limit: "100", nested: "true" }),
  ]);

  // Flujos de caja
  let sells = 0, buys = 0, cSells = 0, cBuys = 0, sSells = 0, sBuys = 0;
  for (const f of fills) {
    const v = num(f.qty) * num(f.price);
    const sell = (f.side ?? "").startsWith("sell");
    const cr = isCrypto(f.symbol ?? "");
    if (sell) { sells += v; if (cr) cSells += v; else sSells += v; }
    else { buys += v; if (cr) cBuys += v; else sBuys += v; }
  }
  const funding = nonFill.filter((a) => a.activity_type === "JNLC").reduce((s, a) => s + num(a.net_amount), 0) || bot.initialCapital;
  const feesC = nonFill.filter((a) => a.activity_type === "CFEE").reduce((s, a) => s + num(a.net_amount), 0);
  const feesS = nonFill.filter((a) => a.activity_type === "FEE").reduce((s, a) => s + num(a.net_amount), 0);

  let posMv = 0, cOpenMv = 0, sOpenMv = 0;
  for (const p of positions) {
    const mv = num(p.market_value);
    posMv += mv;
    if (isCrypto(p.symbol)) cOpenMv += mv; else sOpenMv += mv;
  }

  const cashLog = funding + sells - buys + feesC + feesS;
  const reconciledEquity = cashLog + posMv;
  const totalPnl = reconciledEquity - funding;

  const cryptoPnl = cSells - cBuys + cOpenMv + feesC;
  const stockPnl = sSells - sBuys + sOpenMv + feesS;

  // Realizado por dirección + ventanas recientes (FIFO sobre fills, normalizado)
  const chron = [...fills].sort((a, b) => (a.transaction_time ?? "").localeCompare(b.transaction_time ?? ""));
  const longq: Record<string, { qty: number; price: number }[]> = {};
  const shortq: Record<string, { qty: number; price: number }[]> = {};
  let stockLong = 0, stockShort = 0, cryptoLong = 0, cryptoShort = 0, realized7d = 0, realized30d = 0;
  const now = Date.now();
  const wk = now - 7 * 864e5, mo = now - 30 * 864e5;
  const book = (r: Record<string, { qty: number; price: number }[]>, k: string) => (r[k] ??= []);
  const realize = (asset: "crypto" | "stock", dir: "long" | "short", pnl: number, t: string) => {
    if (asset === "stock" && dir === "long") stockLong += pnl;
    else if (asset === "stock") stockShort += pnl;
    else if (dir === "long") cryptoLong += pnl;
    else cryptoShort += pnl;
    const tt = new Date(t).getTime();
    if (tt >= wk) realized7d += pnl;
    if (tt >= mo) realized30d += pnl;
  };
  for (const f of chron) {
    const ns = norm(f.symbol ?? "");
    let q = num(f.qty);
    const px = num(f.price);
    const asset = isCrypto(f.symbol ?? "") ? "crypto" : "stock";
    const t = f.transaction_time ?? "";
    if ((f.side ?? "").startsWith("sell")) {
      const lots = book(longq, ns);
      while (q > 1e-9 && lots.length) {
        const lot = lots[0]; const m = Math.min(q, lot.qty);
        realize(asset, "long", (px - lot.price) * m, t); lot.qty -= m; q -= m;
        if (lot.qty <= 1e-9) lots.shift();
      }
      if (q > 1e-9) book(shortq, ns).push({ qty: q, price: px });
    } else {
      const lots = book(shortq, ns);
      while (q > 1e-9 && lots.length) {
        const lot = lots[0]; const m = Math.min(q, lot.qty);
        realize(asset, "short", (lot.price - px) * m, t); lot.qty -= m; q -= m;
        if (lot.qty <= 1e-9) lots.shift();
      }
      if (q > 1e-9) book(longq, ns).push({ qty: q, price: px });
    }
  }

  // Cobertura de stops
  const protectedSyms = new Set<string>();
  const walk = (o: Order) => {
    if (["stop", "stop_limit", "trailing_stop"].includes(o.type)) protectedSyms.add(norm(o.symbol));
    (o.legs ?? []).forEach(walk);
  };
  openOrders.forEach(walk);
  const unprotected = positions.filter((p) => !protectedSyms.has(norm(p.symbol))).map((p) => p.symbol);

  const lastFillTime = chron.length ? chron[chron.length - 1].transaction_time ?? null : null;

  return {
    id: bot.id,
    name: bot.name,
    funding,
    reconciledEquity,
    rawEquity: num(account.equity),
    cashLog,
    positionsMv: posMv,
    totalPnl,
    totalPnlPct: funding > 0 ? (totalPnl / funding) * 100 : 0,
    fees: feesC + feesS,
    cryptoPnl,
    stockPnl,
    stockLong,
    stockShort,
    cryptoLong,
    cryptoShort,
    realized7d,
    realized30d,
    openPositions: positions.length,
    unprotected,
    lastFillTime,
  };
}
