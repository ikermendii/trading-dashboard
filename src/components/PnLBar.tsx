"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { format } from "date-fns";
import type { EquityPoint } from "@/lib/types";

export type PnlView = "daily" | "monthly" | "yearly";

interface Props {
  data: EquityPoint[];
  view: PnlView;
  isDark: boolean;
}

interface Bar {
  timestamp: number;
  pnl: number;
}

function groupData(data: EquityPoint[], view: PnlView): Bar[] {
  if (view === "daily") return data.slice(-60);

  const groups: Record<string, Bar> = {};
  for (const pt of data) {
    const d = new Date(pt.timestamp);
    const key =
      view === "monthly"
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        : `${d.getFullYear()}`;
    if (!groups[key]) groups[key] = { timestamp: pt.timestamp, pnl: 0 };
    groups[key].pnl += pt.pnl;
  }
  return Object.values(groups).sort((a, b) => a.timestamp - b.timestamp);
}

function tickLabel(ts: number, view: PnlView) {
  const d = new Date(ts);
  if (view === "daily")   return format(d, "dd");
  if (view === "monthly") return format(d, "MMM yy");
  return format(d, "yyyy");
}

function tooltipLabel(ts: number, view: PnlView) {
  const d = new Date(ts);
  if (view === "daily")   return format(d, "dd MMM yyyy");
  if (view === "monthly") return format(d, "MMMM yyyy");
  return format(d, "yyyy");
}

export function PnLBar({ data, view, isDark }: Props) {
  const bars = groupData(data, view);
  if (!bars.length) return null;

  const tickColor = isDark ? "#52525b" : "#9ca3af";
  const tooltipBg = isDark ? "#18181b" : "#ffffff";
  const tooltipBorder = isDark ? "#3f3f46" : "#e5e7eb";

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={bars} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="timestamp"
          tickFormatter={(ts) => tickLabel(ts, view)}
          tick={{ fill: tickColor, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval={view === "daily" ? 6 : "preserveStartEnd"}
        />
        <YAxis
          tickFormatter={(v) => `${v > 0 ? "+" : ""}${(v / 1000).toFixed(1)}k`}
          tick={{ fill: tickColor, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: "8px",
            fontSize: 12,
          }}
          labelStyle={{ color: isDark ? "#a1a1aa" : "#6b7280" }}
          itemStyle={{ color: isDark ? "#e4e4e7" : "#111827" }}
          labelFormatter={(ts) => tooltipLabel(ts, view)}
          formatter={(val) => [
            `${Number(val) >= 0 ? "+" : "-"}$${Math.abs(Number(val)).toFixed(0)}`,
            "P&L",
          ]}
        />
        <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
          {bars.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.pnl >= 0 ? "#10b981" : "#f87171"}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
