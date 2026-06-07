"use client";

import {
  LineChart,
  Line,
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

export function HeartRateChart({ data }: { data: DataPoint[] }) {
  const chartData = data.slice(-100).map((d) => ({
    time: format(new Date(d.timestamp), "HH:mm"),
    bpm: Math.round(d.value),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="time" tick={{ fontSize: 12 }} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
        <Tooltip formatter={(v) => [`${v} bpm`, "Heart Rate"]} />
        <Line type="monotone" dataKey="bpm" stroke="#ef4444" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
