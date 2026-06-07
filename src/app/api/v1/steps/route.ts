import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, parseDateRange, parsePagination } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { result, headers } = auth;

  const { from, to } = parseDateRange(req);
  const { page, limit, skip } = parsePagination(req);

  const [data, total] = await Promise.all([
    prisma.healthDataPoint.findMany({
      where: { userId: result.userId, type: "steps", timestamp: { gte: from, lte: to } },
      orderBy: { timestamp: "asc" },
      skip,
      take: limit,
      select: { timestamp: true, value: true, unit: true },
    }),
    prisma.healthDataPoint.count({
      where: { userId: result.userId, type: "steps", timestamp: { gte: from, lte: to } },
    }),
  ]);

  return NextResponse.json(
    { data, meta: { total, page, limit, from: from.toISOString(), to: to.toISOString() } },
    { headers }
  );
}
