"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import type { EquityPoint } from "@/lib/types";

interface Props {
  data: EquityPoint[];
  initialCapital: number;
  isDark: boolean;
}

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function EquityCurve({ data, initialCapital, isDark }: Props) {
  if (!data.length) return (
    <div className="h-64 flex items-center justify-center text-gray-400 dark:text-zinc-600 text-sm">
      Sin datos históricos
    </div>
  );

  const min = Math.min(...data.map((d) => d.equity), initialCapital) * 0.98;
  const max = Math.max(...data.map((d) => d.equity), initialCapital) * 1.02;
  const lastEquity = data[data.length - 1]?.equity ?? initialCapital;
  const isPositive = lastEquity >= initialCapital;

  const stroke = isPositive ? "#10b981" : "#f87171";
  const tickColor = isDark ? "#52525b" : "#9ca3af";
  const tooltipBg = isDark ? "#18181b" : "#ffffff";
  const tooltipBorder = isDark ? "#3f3f46" : "#e5e7eb";
  const refLineColor = isDark ? "#3f3f46" : "#d1d5db";

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={stroke} stopOpacity={0.25} />
            <stop offset="95%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="timestamp"
          tickFormatter={(ts) => format(new Date(ts), "dd MMM")}
          tick={{ fill: tickColor, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[min, max]}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          tick={{ fill: tickColor, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: "8px",
            fontSize: 13,
            color: isDark ? "#e4e4e7" : "#111827",
          }}
          labelStyle={{ color: isDark ? "#a1a1aa" : "#6b7280" }}
          labelFormatter={(ts) => format(new Date(ts), "dd MMM yyyy")}
          formatter={(val) => [fmt(Number(val)), "Equity"]}
        />
        <ReferenceLine
          y={initialCapital}
          stroke={refLineColor}
          strokeDasharray="4 3"
          strokeWidth={1}
        />
        <Area
          type="monotone"
          dataKey="equity"
          stroke={stroke}
          strokeWidth={2}
          fill="url(#equityGradient)"
          dot={false}
          activeDot={{ r: 4, fill: stroke }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
