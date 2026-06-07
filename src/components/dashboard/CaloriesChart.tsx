"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

interface DataPoint {
  timestamp: string;
  value: number;
}

export function CaloriesChart({ data }: { data: DataPoint[] }) {
  const chartData = data.map((d) => ({
    date: format(new Date(d.timestamp), "MMM d"),
    calories: Math.round(d.value),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip formatter={(v) => [`${v} kcal`, "Calories"]} />
        <Area type="monotone" dataKey="calories" stroke="#f97316" fill="#fed7aa" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
