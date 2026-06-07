import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StepsChart } from "@/components/dashboard/StepsChart";
import { HeartRateChart } from "@/components/dashboard/HeartRateChart";
import { SleepChart } from "@/components/dashboard/SleepChart";
import { CaloriesChart } from "@/components/dashboard/CaloriesChart";
import { WeeklyActivity } from "@/components/dashboard/WeeklyActivity";
import { SyncButton } from "@/components/dashboard/SyncButton";
import { ConnectHuawei } from "@/components/dashboard/ConnectHuawei";
import { Activity, Heart, Moon, Zap, Droplets, Brain } from "lucide-react";
import { subDays, startOfDay, endOfDay } from "date-fns";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id as string;

  const huaweiToken = await prisma.huaweiOAuthToken.findUnique({
    where: { userId },
    select: { lastSyncAt: true, huaweiUserId: true },
  });

  const thirtyDaysAgo = subDays(new Date(), 30);
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const [
    stepsData,
    heartRateData,
    caloriesData,
    sleepData,
    todaySteps,
    todayCalories,
    todayHeartRate,
    todaySpo2,
    activitiesCount,
  ] = await Promise.all([
    prisma.healthDataPoint.findMany({
      where: { userId, type: "steps", timestamp: { gte: thirtyDaysAgo } },
      orderBy: { timestamp: "asc" },
      take: 30,
    }),
    prisma.healthDataPoint.findMany({
      where: { userId, type: "heart_rate", timestamp: { gte: subDays(new Date(), 1) } },
      orderBy: { timestamp: "asc" },
      take: 200,
    }),
    prisma.healthDataPoint.findMany({
      where: { userId, type: "calories", timestamp: { gte: thirtyDaysAgo } },
      orderBy: { timestamp: "asc" },
      take: 30,
    }),
    prisma.sleepSession.findMany({
      where: { userId, startTime: { gte: thirtyDaysAgo } },
      orderBy: { startTime: "asc" },
      take: 30,
    }),
    prisma.healthDataPoint.aggregate({
      where: { userId, type: "steps", timestamp: { gte: todayStart, lte: todayEnd } },
      _sum: { value: true },
    }),
    prisma.healthDataPoint.aggregate({
      where: { userId, type: "calories", timestamp: { gte: todayStart, lte: todayEnd } },
      _sum: { value: true },
    }),
    prisma.healthDataPoint.aggregate({
      where: { userId, type: "heart_rate", timestamp: { gte: todayStart, lte: todayEnd } },
      _avg: { value: true },
    }),
    prisma.healthDataPoint.findFirst({
      where: { userId, type: "spo2", timestamp: { gte: todayStart, lte: todayEnd } },
      orderBy: { timestamp: "desc" },
    }),
    prisma.activity.count({
      where: { userId, startTime: { gte: thirtyDaysAgo } },
    }),
  ]);

  // Build weekly stats for radar chart
  const weeklyDays = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    return {
      date: day.toISOString().split("T")[0],
      steps: 0,
      calories: 0,
      activities: 0,
    };
  });

  const statsMap = new Map(weeklyDays.map((d) => [d.date, d]));
  for (const dp of stepsData) {
    const date = new Date(dp.timestamp).toISOString().split("T")[0];
    if (statsMap.has(date)) statsMap.get(date)!.steps = dp.value;
  }
  for (const dp of caloriesData) {
    const date = new Date(dp.timestamp).toISOString().split("T")[0];
    if (statsMap.has(date)) statsMap.get(date)!.calories = dp.value;
  }

  const weeklyData = Array.from(statsMap.values());

  const stats = [
    { icon: Activity, label: "Steps Today", value: (todaySteps._sum.value || 0).toLocaleString(), unit: "steps", color: "text-blue-600", bg: "bg-blue-50" },
    { icon: Heart, label: "Avg Heart Rate", value: Math.round(todayHeartRate._avg.value || 0).toString(), unit: "bpm", color: "text-red-600", bg: "bg-red-50" },
    { icon: Zap, label: "Calories Today", value: Math.round(todayCalories._sum.value || 0).toString(), unit: "kcal", color: "text-orange-600", bg: "bg-orange-50" },
    { icon: Droplets, label: "SpO2", value: todaySpo2 ? `${todaySpo2.value}` : "—", unit: "%", color: "text-cyan-600", bg: "bg-cyan-50" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Health Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            {activitiesCount} activities in the last 30 days
          </p>
        </div>
        {huaweiToken ? (
          <SyncButton lastSyncAt={huaweiToken.lastSyncAt?.toISOString() ?? null} />
        ) : (
          <ConnectHuawei />
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(({ icon: Icon, label, value, unit, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{unit} · {label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              Daily Steps (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stepsData.length > 0 ? (
              <StepsChart data={stepsData.map((d) => ({ timestamp: d.timestamp.toISOString(), value: d.value }))} />
            ) : (
              <EmptyChart message="No step data yet" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-600" />
              Heart Rate (last 24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {heartRateData.length > 0 ? (
              <HeartRateChart data={heartRateData.map((d) => ({ timestamp: d.timestamp.toISOString(), value: d.value }))} />
            ) : (
              <EmptyChart message="No heart rate data yet" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-indigo-600" />
              Sleep Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sleepData.length > 0 ? (
              <SleepChart data={sleepData.map((d) => ({
                startTime: d.startTime.toISOString(),
                durationMins: d.durationMins,
                stages: d.stages as { deep?: number; light?: number; rem?: number; awake?: number } | null,
              }))} />
            ) : (
              <EmptyChart message="No sleep data yet" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-600" />
              Calories Burned
            </CardTitle>
          </CardHeader>
          <CardContent>
            {caloriesData.length > 0 ? (
              <CaloriesChart data={caloriesData.map((d) => ({ timestamp: d.timestamp.toISOString(), value: d.value }))} />
            ) : (
              <EmptyChart message="No calorie data yet" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-600" />
            Weekly Activity Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WeeklyActivity data={weeklyData} />
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
      {message}
    </div>
  );
}
