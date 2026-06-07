import { prisma } from "./prisma";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 100;

export async function checkRateLimit(apiKeyId: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS);
  const resetAt = new Date(windowStart.getTime() + WINDOW_MS);

  const record = await prisma.rateLimit.upsert({
    where: { apiKeyId_windowStart: { apiKeyId, windowStart } },
    create: { apiKeyId, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  });

  const allowed = record.count <= MAX_REQUESTS;
  const remaining = Math.max(0, MAX_REQUESTS - record.count);

  return { allowed, remaining, resetAt };
}
