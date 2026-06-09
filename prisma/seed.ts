// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");
import { subDays, addHours, startOfDay } from "date-fns";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with sample data...");

  const demoPassword = await bcrypt.hash("demo1234", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
      password: demoPassword,
      emailVerified: new Date(),
    },
  });

  console.log(`User: ${user.email} (${user.id})`);

  // Create a fake Huawei token
  await prisma.huaweiOAuthToken.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      accessTokenEnc: "encrypted_placeholder",
      refreshTokenEnc: "encrypted_placeholder",
      expiresAt: addHours(new Date(), 1),
      scope: "health:read",
      huaweiUserId: "demo_huawei_123",
      lastSyncAt: new Date(),
    },
  });

  // Generate 30 days of health data
  const now = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const healthPoints: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sleepSessions: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activities: any[] = [];

  for (let i = 29; i >= 0; i--) {
    const day = startOfDay(subDays(now, i));

    // Steps (7000-15000 per day)
    healthPoints.push({
      userId: user.id,
      type: "steps",
      value: Math.floor(7000 + Math.random() * 8000),
      unit: "count",
      timestamp: addHours(day, 23),
    });

    // Calories (1800-2800 per day)
    healthPoints.push({
      userId: user.id,
      type: "calories",
      value: Math.floor(1800 + Math.random() * 1000),
      unit: "kcal",
      timestamp: addHours(day, 23),
    });

    // Heart rate readings throughout the day (every 30 min)
    for (let h = 0; h < 24; h += 0.5) {
      const base = h > 6 && h < 22 ? 70 : 58;
      healthPoints.push({
        userId: user.id,
        type: "heart_rate",
        value: Math.round(base + Math.random() * 20),
        unit: "bpm",
        timestamp: addHours(day, h),
      });
    }

    // SpO2 (once per day)
    healthPoints.push({
      userId: user.id,
      type: "spo2",
      value: 96 + Math.floor(Math.random() * 3),
      unit: "%",
      timestamp: addHours(day, 8),
    });

    // Stress level (once per day)
    healthPoints.push({
      userId: user.id,
      type: "stress",
      value: Math.floor(20 + Math.random() * 60),
      unit: "score",
      timestamp: addHours(day, 14),
    });

    // Sleep session
    const sleepStart = addHours(day, 23);
    const sleepDuration = Math.floor(380 + Math.random() * 120);
    const deepMins = Math.floor(sleepDuration * 0.18);
    const remMins = Math.floor(sleepDuration * 0.22);
    const awakeMins = Math.floor(sleepDuration * 0.07);
    const lightMins = sleepDuration - deepMins - remMins - awakeMins;

    sleepSessions.push({
      userId: user.id,
      startTime: sleepStart,
      endTime: addHours(sleepStart, sleepDuration / 60),
      durationMins: sleepDuration,
      stages: { deep: deepMins, light: lightMins, rem: remMins, awake: awakeMins },
      quality: Math.floor(60 + Math.random() * 35),
    });

    // Random workout (every 2-3 days)
    if (i % 3 === 0) {
      const workoutTypes = ["running", "cycling", "walking", "swimming", "yoga"];
      const type = workoutTypes[Math.floor(Math.random() * workoutTypes.length)];
      const duration = Math.floor(20 + Math.random() * 60);
      const activityStart = addHours(day, 7);

      activities.push({
        userId: user.id,
        type,
        startTime: activityStart,
        endTime: addHours(activityStart, duration / 60),
        durationMins: duration,
        calories: Math.floor(duration * (8 + Math.random() * 6)),
        distance: type === "running" || type === "cycling" ? Math.floor(1000 + Math.random() * 8000) : null,
        avgHeartRate: Math.floor(120 + Math.random() * 50),
        steps: type === "running" || type === "walking" ? Math.floor(duration * 100) : null,
      });
    }
  }

  await prisma.healthDataPoint.deleteMany({ where: { userId: user.id } });
  await prisma.sleepSession.deleteMany({ where: { userId: user.id } });
  await prisma.activity.deleteMany({ where: { userId: user.id } });

  await prisma.healthDataPoint.createMany({ data: healthPoints });
  await prisma.sleepSession.createMany({ data: sleepSessions });
  await prisma.activity.createMany({ data: activities });

  // Create a demo API key
  const rawKey = "hwh_demo00000000000000000000000000000000000000000000";
  const keyHash = await bcrypt.hash(rawKey, 12);

  await prisma.apiKey.upsert({
    where: { keyHash },
    update: {},
    create: {
      userId: user.id,
      name: "Demo Key",
      keyHash,
      keyPrefix: rawKey.slice(0, 12),
    },
  });

  console.log(`\nSeed complete!`);
  console.log(`User email: demo@example.com`);
  console.log(`User password: demo1234`);
  console.log(`Demo API key: ${rawKey}`);
  console.log(`Health data points: ${healthPoints.length}`);
  console.log(`Sleep sessions: ${sleepSessions.length}`);
  console.log(`Activities: ${activities.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
