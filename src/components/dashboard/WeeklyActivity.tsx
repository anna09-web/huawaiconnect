"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface DailyStats {
  date: string;
  steps: number;
  calories: number;
  activities: number;
}

export function WeeklyActivity({ data }: { data: DailyStats[] }) {
  const maxSteps = Math.max(...data.map((d) => d.steps), 1);

  const chartData = data.map((d) => ({
    day: d.date.slice(5),
    steps: Math.round((d.steps / maxSteps) * 100),
    calories: Math.round(d.calories / 30),
    activities: d.activities * 10,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={chartData}>
        <PolarGrid />
        <PolarAngleAxis dataKey="day" tick={{ fontSize: 12 }} />
        <Radar name="Steps" dataKey="steps" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
        <Radar name="Calories" dataKey="calories" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
        <Tooltip />
      </RadarChart>
    </ResponsiveContainer>
  );
}
