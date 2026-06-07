import { decrypt, encrypt } from "./crypto";
import { prisma } from "./prisma";

const HUAWEI_BASE_URL = "https://health-api.cloud.huawei.com/healthkit/v1";
const TOKEN_URL = "https://oauth-login.cloud.huawei.com/oauth2/v3/token";
const AUTH_URL = "https://oauth-login.cloud.huawei.com/oauth2/v3/authorize";

export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.HUAWEI_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/huawei/callback`,
    scope: "https://www.huawei.com/healthkit/activity.read https://www.huawei.com/healthkit/heartrate.read https://www.huawei.com/healthkit/step.read https://www.huawei.com/healthkit/sleep.read https://www.huawei.com/healthkit/calories.read https://www.huawei.com/healthkit/spo2.read https://www.huawei.com/healthkit/stress.read",
    state,
    access_type: "offline",
  });
  return `${AUTH_URL}?${params}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.HUAWEI_CLIENT_ID!,
      client_secret: process.env.HUAWEI_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/huawei/callback`,
      code,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Huawei token exchange failed: ${err}`);
  }
  return res.json();
}

export async function refreshAccessToken(userId: string): Promise<string> {
  const token = await prisma.huaweiOAuthToken.findUnique({ where: { userId } });
  if (!token) throw new Error("No Huawei token for user");

  const refreshToken = decrypt(token.refreshTokenEnc);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.HUAWEI_CLIENT_ID!,
      client_secret: process.env.HUAWEI_CLIENT_SECRET!,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) throw new Error("Failed to refresh Huawei token");
  const data = await res.json();

  await prisma.huaweiOAuthToken.update({
    where: { userId },
    data: {
      accessTokenEnc: encrypt(data.access_token),
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      ...(data.refresh_token && { refreshTokenEnc: encrypt(data.refresh_token) }),
    },
  });

  return data.access_token;
}

async function getValidAccessToken(userId: string): Promise<string> {
  const token = await prisma.huaweiOAuthToken.findUnique({ where: { userId } });
  if (!token) throw new Error("No Huawei token for user");

  if (token.expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return decrypt(token.accessTokenEnc);
  }
  return refreshAccessToken(userId);
}

interface DataGroup {
  startTimeMillis: string;
  endTimeMillis: string;
  dataset: Array<{
    dataTypeName: string;
    dataCollector: object;
    point: Array<{
      startTimeNanos: string;
      endTimeNanos: string;
      value: Array<{ intVal?: number; fpVal?: number }>;
    }>;
  }>;
}

async function queryHealthData(
  userId: string,
  dataTypeNames: string[],
  startTime: Date,
  endTime: Date
): Promise<DataGroup[]> {
  const accessToken = await getValidAccessToken(userId);

  const res = await fetch(`${HUAWEI_BASE_URL}/datastore:getData`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      dataType: dataTypeNames.map((name) => ({ dataTypeName: name })),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Huawei API error: ${err}`);
  }

  const data = await res.json();
  return data.group || [];
}

export async function syncHealthData(userId: string): Promise<void> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    await Promise.all([
      syncSteps(userId, thirtyDaysAgo, now),
      syncHeartRate(userId, thirtyDaysAgo, now),
      syncCalories(userId, thirtyDaysAgo, now),
      syncSleep(userId, thirtyDaysAgo, now),
      syncActivities(userId, thirtyDaysAgo, now),
      syncSpO2(userId, thirtyDaysAgo, now),
      syncStress(userId, thirtyDaysAgo, now),
    ]);

    await prisma.huaweiOAuthToken.update({
      where: { userId },
      data: { lastSyncAt: now },
    });
  } catch (err) {
    console.error(`Sync failed for user ${userId}:`, err);
    throw err;
  }
}

async function syncSteps(userId: string, start: Date, end: Date): Promise<void> {
  const groups = await queryHealthData(
    userId,
    ["com.huawei.continuous.steps.total.daily.count"],
    start,
    end
  );

  const points = groups.flatMap((g) =>
    g.dataset.flatMap((ds) =>
      ds.point.map((p) => ({
        userId,
        type: "steps",
        value: p.value[0]?.intVal ?? 0,
        unit: "count",
        timestamp: new Date(parseInt(p.startTimeNanos) / 1e6),
      }))
    )
  );

  for (const point of points) {
    await prisma.healthDataPoint.create({ data: point }).catch(() => {});
  }
}

async function syncHeartRate(userId: string, start: Date, end: Date): Promise<void> {
  const groups = await queryHealthData(
    userId,
    ["com.huawei.continuous.heart_rate.bpm"],
    start,
    end
  );

  const points = groups.flatMap((g) =>
    g.dataset.flatMap((ds) =>
      ds.point.map((p) => ({
        userId,
        type: "heart_rate",
        value: p.value[0]?.fpVal ?? p.value[0]?.intVal ?? 0,
        unit: "bpm",
        timestamp: new Date(parseInt(p.startTimeNanos) / 1e6),
      }))
    )
  );

  for (const point of points) {
    await prisma.healthDataPoint.create({ data: point }).catch(() => {});
  }
}

async function syncCalories(userId: string, start: Date, end: Date): Promise<void> {
  const groups = await queryHealthData(
    userId,
    ["com.huawei.continuous.calories.total.daily.count"],
    start,
    end
  );

  const points = groups.flatMap((g) =>
    g.dataset.flatMap((ds) =>
      ds.point.map((p) => ({
        userId,
        type: "calories",
        value: p.value[0]?.fpVal ?? p.value[0]?.intVal ?? 0,
        unit: "kcal",
        timestamp: new Date(parseInt(p.startTimeNanos) / 1e6),
      }))
    )
  );

  for (const point of points) {
    await prisma.healthDataPoint.create({ data: point }).catch(() => {});
  }
}

async function syncSleep(userId: string, start: Date, end: Date): Promise<void> {
  const groups = await queryHealthData(
    userId,
    ["com.huawei.health.sleep.segment"],
    start,
    end
  );

  for (const group of groups) {
    for (const ds of group.dataset) {
      for (const p of ds.point) {
        const startTime = new Date(parseInt(p.startTimeNanos) / 1e6);
        const endTime = new Date(parseInt(p.endTimeNanos) / 1e6);
        const durationMins = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
        const stageType = p.value[0]?.intVal ?? 0;

        const stages: Record<string, number> = {};
        // 1=light, 2=deep, 3=REM, 4=awake
        if (stageType === 1) stages.light = durationMins;
        else if (stageType === 2) stages.deep = durationMins;
        else if (stageType === 3) stages.rem = durationMins;
        else if (stageType === 4) stages.awake = durationMins;

        await prisma.sleepSession.create({
          data: { userId, startTime, endTime, durationMins, stages },
        }).catch(() => {});
      }
    }
  }
}

async function syncActivities(userId: string, start: Date, end: Date): Promise<void> {
  const accessToken = await getValidAccessToken(userId);
  const res = await fetch(
    `${HUAWEI_BASE_URL}/activities?startTime=${start.toISOString()}&endTime=${end.toISOString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return;

  const data = await res.json();
  const records = data.activityRecord || [];

  for (const record of records) {
    await prisma.activity.create({
      data: {
        userId,
        type: record.sportType?.toString() || "unknown",
        startTime: new Date(record.startTime),
        endTime: new Date(record.endTime),
        durationMins: Math.round(record.duration / 60),
        calories: record.totalCalories,
        distance: record.totalDistance,
        avgHeartRate: record.avgHeartRate,
        steps: record.totalSteps,
        metadata: record,
      },
    }).catch(() => {});
  }
}

async function syncSpO2(userId: string, start: Date, end: Date): Promise<void> {
  const groups = await queryHealthData(
    userId,
    ["com.huawei.continuous.spo2.saturation.percent"],
    start,
    end
  );

  const points = groups.flatMap((g) =>
    g.dataset.flatMap((ds) =>
      ds.point.map((p) => ({
        userId,
        type: "spo2",
        value: p.value[0]?.fpVal ?? p.value[0]?.intVal ?? 0,
        unit: "%",
        timestamp: new Date(parseInt(p.startTimeNanos) / 1e6),
      }))
    )
  );

  for (const point of points) {
    await prisma.healthDataPoint.create({ data: point }).catch(() => {});
  }
}

async function syncStress(userId: string, start: Date, end: Date): Promise<void> {
  const groups = await queryHealthData(
    userId,
    ["com.huawei.instantaneous.stress.score"],
    start,
    end
  );

  const points = groups.flatMap((g) =>
    g.dataset.flatMap((ds) =>
      ds.point.map((p) => ({
        userId,
        type: "stress",
        value: p.value[0]?.intVal ?? 0,
        unit: "score",
        timestamp: new Date(parseInt(p.startTimeNanos) / 1e6),
      }))
    )
  );

  for (const point of points) {
    await prisma.healthDataPoint.create({ data: point }).catch(() => {});
  }
}
