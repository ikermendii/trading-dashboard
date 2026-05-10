# Trading Dashboard

Real-time web dashboard for monitoring multi-agent algorithmic trading bots. Displays equity curves, P&L charts, open positions, and trade history for two independent bots connected to Alpaca Markets.

**Live demo → [trading-dashboard-psi-flax.vercel.app](https://trading-dashboard-psi-flax.vercel.app)**

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- **Multi-bot selector** — switch between Bot MCP (CrewAI + Claude Sonnet) and Bot Hybrid (Quant + DeepSeek)
- **Equity curve** — interactive area chart with 1M / 3M / 6M / 1Y / ALL period filters
- **P&L bar chart** — daily, monthly, or yearly view with green/red bars per period
- **Live positions** — sorted by unrealized P&L %, with visual progress bars
- **Trade history** — last 100 fills fetched from Alpaca with FIFO P&L matching
- **Key metrics** — equity, daily P&L, buying power, win rate, profit factor, avg win/loss
- **Dark / Light mode** — toggle in header, preference persisted in `localStorage`
- **CSV export** — one-click export for positions, trade history, and equity curve data
- **Auto-refresh** — data updates every 60 seconds automatically

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Icons | Lucide React |
| Data source | Alpaca Markets REST API |
| Hosting | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- One or two [Alpaca paper trading](https://alpaca.markets) accounts

### Installation

```bash
git clone https://github.com/ikermendii/trading-dashboard.git
cd trading-dashboard
npm install
```

### Configuration

Create `.env.local` in the project root:

```env
# Bot MCP (CrewAI agent bot)
MCP_ALPACA_KEY=your_alpaca_key_id
MCP_ALPACA_SECRET=your_alpaca_secret_key

# Bot Hybrid (optional — quant bot)
HYBRID_ALPACA_KEY=your_alpaca_key_id
HYBRID_ALPACA_SECRET=your_alpaca_secret_key
```

Both bots must point to paper trading accounts (`https://paper-api.alpaca.markets`). Remove the `hybrid` entry from `src/lib/alpaca.ts` if you only have one bot.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ikermendii/trading-dashboard)

After deploying, add the four environment variables in **Vercel → Project → Settings → Environment Variables**. Or via CLI:

```bash
vercel env add MCP_ALPACA_KEY production
vercel env add MCP_ALPACA_SECRET production
vercel env add HYBRID_ALPACA_KEY production   # optional
vercel env add HYBRID_ALPACA_SECRET production # optional
vercel --prod
```

## Project Structure

```
src/
├── app/
│   ├── api/dashboard/route.ts   # Server-side Alpaca proxy (keeps keys off client)
│   ├── page.tsx                 # Main dashboard SPA
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── EquityCurve.tsx          # Area chart with period filter
│   ├── PnLBar.tsx               # Bar chart — daily / monthly / yearly grouping
│   ├── MetricCard.tsx           # KPI card (dark + light mode)
│   ├── PositionsTable.tsx       # Open positions with P&L mini-bars
│   └── TradeHistory.tsx         # Fill activity table
└── lib/
    ├── alpaca.ts                # Alpaca API client + multi-bot config
    └── types.ts                 # Shared TypeScript interfaces
```

## Adding a New Bot

1. Get an Alpaca paper trading API key pair
2. Add the key pair to `.env.local` (e.g. `MYBOT_ALPACA_KEY` / `MYBOT_ALPACA_SECRET`)
3. Add a new entry to the `BOTS` record in `src/lib/alpaca.ts`
4. Add the bot to the `BOTS` array in `src/app/page.tsx`

## Related Projects

- [trading-bot-mcp](https://github.com/ikermendii/trading-bot-mcp) — multi-agent CrewAI trading bot (Claude Sonnet)
- [trading-bot-hybrid](https://github.com/ikermendii/trading-bot-hybrid) — quantitative Donchian breakout bot (DeepSeek veto)

## License

MIT
