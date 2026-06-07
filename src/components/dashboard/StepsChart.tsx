"use client";

import {
  BarChart,
  Bar,
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

export function StepsChart({ data }: { data: DataPoint[] }) {
  const chartData = data.map((d) => ({
    date: format(new Date(d.timestamp), "MMM d"),
    steps: Math.round(d.value),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip formatter={(v) => [`${Number(v).toLocaleString()} steps`, "Steps"]} />
        <Bar dataKey="steps" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
