import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";
import { verifyApiKey } from "./api-key";
import { checkRateLimit } from "./rate-limit";

export interface ApiAuthResult {
  userId: string;
  apiKeyId: string;
}

export async function authenticateApiKey(
  req: NextRequest
): Promise<{ result: ApiAuthResult; headers: Record<string, string> } | NextResponse> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  const key = authHeader.slice(7);
  if (!key.startsWith("hwh_")) {
    return NextResponse.json({ error: "Invalid API key format" }, { status: 401 });
  }

  const prefix = key.slice(0, 12);
  const apiKeys = await prisma.apiKey.findMany({
    where: {
      keyPrefix: prefix,
      revokedAt: null,
    },
  });

  let matchedKey = null;
  for (const apiKey of apiKeys) {
    if (await verifyApiKey(key, apiKey.keyHash)) {
      matchedKey = apiKey;
      break;
    }
  }

  if (!matchedKey) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  if (matchedKey.expiresAt && matchedKey.expiresAt < new Date()) {
    return NextResponse.json({ error: "API key expired" }, { status: 401 });
  }

  const { allowed, remaining, resetAt } = await checkRateLimit(matchedKey.id);

  await prisma.apiKey.update({
    where: { id: matchedKey.id },
    data: { lastUsedAt: new Date() },
  });

  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", resetAt: resetAt.toISOString() },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": resetAt.toISOString(),
        },
      }
    );
  }

  return {
    result: { userId: matchedKey.userId, apiKeyId: matchedKey.id },
    headers: {
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": resetAt.toISOString(),
    },
  };
}

export function parseDateRange(req: NextRequest): { from: Date; to: Date } {
  const url = new URL(req.url);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");

  const to = toStr ? new Date(toStr) : new Date();
  const from = fromStr ? new Date(fromStr) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

  return { from, to };
}

export function parsePagination(req: NextRequest): { page: number; limit: number; skip: number } {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(1000, Math.max(1, parseInt(url.searchParams.get("limit") || "100")));
  return { page, limit, skip: (page - 1) * limit };
}
