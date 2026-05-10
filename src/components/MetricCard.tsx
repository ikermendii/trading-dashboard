"use client";

import { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean | null;
  icon?: ReactNode;
  large?: boolean;
}

export function MetricCard({ label, value, sub, positive, icon, large }: MetricCardProps) {
  const valueColor =
    positive === true ? "text-emerald-500" :
    positive === false ? "text-red-500" :
    "text-gray-900 dark:text-white";

  const subColor =
    positive === true ? "text-emerald-500" :
    positive === false ? "text-red-500" :
    "text-gray-500 dark:text-zinc-400";

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-1 hover:border-gray-300 dark:hover:border-zinc-600 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-zinc-500 uppercase tracking-wider font-medium">
          {label}
        </span>
        {icon && <span className="text-gray-400 dark:text-zinc-600">{icon}</span>}
      </div>
      <span className={`font-bold tabular-nums ${large ? "text-3xl" : "text-2xl"} ${valueColor}`}>
        {value}
      </span>
      {sub && (
        <span className={`text-sm tabular-nums ${subColor}`}>
          {sub}
        </span>
      )}
    </div>
  );
}
