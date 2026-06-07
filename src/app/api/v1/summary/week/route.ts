import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek, eachDayOfInterval, startOfDay, endOfDay, format } from "date-fns";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { result, headers } = auth;

  const today = new Date();
  const from = startOfWeek(today, { weekStartsOn: 1 });
  const to = endOfWeek(today, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: from, end: today });

  const dailyStats = await Promise.all(
    days.map(async (day) => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      const [steps, calories, heartRate, activitiesCount] = await Promise.all([
        prisma.healthDataPoint.aggregate({
          where: { userId: result.userId, type: "steps", timestamp: { gte: dayStart, lte: dayEnd } },
          _sum: { value: true },
        }),
        prisma.healthDataPoint.aggregate({
          where: { userId: result.userId, type: "calories", timestamp: { gte: dayStart, lte: dayEnd } },
          _sum: { value: true },
        }),
        prisma.healthDataPoint.aggregate({
          where: { userId: result.userId, type: "heart_rate", timestamp: { gte: dayStart, lte: dayEnd } },
          _avg: { value: true },
        }),
        prisma.activity.count({
          where: { userId: result.userId, startTime: { gte: dayStart, lte: dayEnd } },
        }),
      ]);

      return {
        date: format(day, "yyyy-MM-dd"),
        steps: steps._sum.value || 0,
        calories: Math.round(calories._sum.value || 0),
        avgHeartRate: Math.round(heartRate._avg.value || 0),
        activities: activitiesCount,
      };
    })
  );

  const [totalSteps, totalCalories, totalActiveDays, sleepAvg] = [
    dailyStats.reduce((s, d) => s + d.steps, 0),
    dailyStats.reduce((s, d) => s + d.calories, 0),
    dailyStats.filter((d) => d.steps > 0).length,
    await prisma.sleepSession.aggregate({
      where: { userId: result.userId, startTime: { gte: from, lte: to } },
      _avg: { durationMins: true },
    }),
  ];

  return NextResponse.json(
    {
      weekStart: from.toISOString().split("T")[0],
      weekEnd: to.toISOString().split("T")[0],
      summary: {
        totalSteps,
        totalCalories,
        activeDays: totalActiveDays,
        avgSleepMins: Math.round(sleepAvg._avg.durationMins || 0),
      },
      daily: dailyStats,
    },
    { headers }
  );
}
