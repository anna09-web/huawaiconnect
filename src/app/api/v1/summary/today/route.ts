import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { result, headers } = auth;

  const today = new Date();
  const from = startOfDay(today);
  const to = endOfDay(today);

  const [steps, heartRate, calories, spo2, stress, sleep, activities] = await Promise.all([
    prisma.healthDataPoint.aggregate({
      where: { userId: result.userId, type: "steps", timestamp: { gte: from, lte: to } },
      _sum: { value: true },
    }),
    prisma.healthDataPoint.aggregate({
      where: { userId: result.userId, type: "heart_rate", timestamp: { gte: from, lte: to } },
      _avg: { value: true },
      _min: { value: true },
      _max: { value: true },
    }),
    prisma.healthDataPoint.aggregate({
      where: { userId: result.userId, type: "calories", timestamp: { gte: from, lte: to } },
      _sum: { value: true },
    }),
    prisma.healthDataPoint.findFirst({
      where: { userId: result.userId, type: "spo2", timestamp: { gte: from, lte: to } },
      orderBy: { timestamp: "desc" },
      select: { value: true, timestamp: true },
    }),
    prisma.healthDataPoint.findFirst({
      where: { userId: result.userId, type: "stress", timestamp: { gte: from, lte: to } },
      orderBy: { timestamp: "desc" },
      select: { value: true, timestamp: true },
    }),
    prisma.sleepSession.findFirst({
      where: { userId: result.userId, startTime: { gte: new Date(from.getTime() - 12 * 60 * 60 * 1000), lte: to } },
      orderBy: { startTime: "desc" },
      select: { startTime: true, endTime: true, durationMins: true, stages: true, quality: true },
    }),
    prisma.activity.findMany({
      where: { userId: result.userId, startTime: { gte: from, lte: to } },
      select: { type: true, durationMins: true, calories: true, distance: true },
    }),
  ]);

  return NextResponse.json(
    {
      date: from.toISOString().split("T")[0],
      steps: { total: steps._sum.value || 0 },
      heartRate: {
        avg: Math.round(heartRate._avg.value || 0),
        min: heartRate._min.value || 0,
        max: heartRate._max.value || 0,
      },
      calories: { total: Math.round(calories._sum.value || 0) },
      spo2: spo2 ? { value: spo2.value, measuredAt: spo2.timestamp } : null,
      stress: stress ? { value: stress.value, measuredAt: stress.timestamp } : null,
      sleep,
      activities,
    },
    { headers }
  );
}
