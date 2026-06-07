"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

interface SleepSession {
  startTime: string;
  durationMins: number;
  stages: { deep?: number; light?: number; rem?: number; awake?: number } | null;
}

export function SleepChart({ data }: { data: SleepSession[] }) {
  const chartData = data.map((s) => ({
    date: format(new Date(s.startTime), "MMM d"),
    deep: s.stages?.deep || 0,
    light: s.stages?.light || 0,
    rem: s.stages?.rem || 0,
    awake: s.stages?.awake || 0,
    total: Math.round(s.durationMins / 60 * 10) / 10,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} unit="h" />
        <Tooltip formatter={(v, name) => [`${v} min`, name]} />
        <Legend />
        <Bar dataKey="deep" stackId="a" fill="#1d4ed8" name="Deep" radius={[0, 0, 0, 0]} />
        <Bar dataKey="light" stackId="a" fill="#93c5fd" name="Light" />
        <Bar dataKey="rem" stackId="a" fill="#7c3aed" name="REM" />
        <Bar dataKey="awake" stackId="a" fill="#fbbf24" name="Awake" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
