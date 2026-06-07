import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncHealthData } from "@/lib/huawei-api";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tokens = await prisma.huaweiOAuthToken.findMany({
    select: { userId: true },
  });

  const results = await Promise.allSettled(
    tokens.map((t: { userId: string }) => syncHealthData(t.userId))
  );

  const succeeded = results.filter((r: PromiseSettledResult<void>) => r.status === "fulfilled").length;
  const failed = results.filter((r: PromiseSettledResult<void>) => r.status === "rejected").length;

  return NextResponse.json({ synced: succeeded, failed, total: tokens.length });
}
