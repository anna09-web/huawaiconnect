import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncHealthData } from "@/lib/huawei-api";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await prisma.huaweiOAuthToken.findUnique({
    where: { userId: session.user.id },
  });

  if (!token) {
    return NextResponse.json({ error: "Huawei account not connected" }, { status: 400 });
  }

  try {
    await syncHealthData(session.user.id);
    const updated = await prisma.huaweiOAuthToken.findUnique({
      where: { userId: session.user.id },
      select: { lastSyncAt: true },
    });
    return NextResponse.json({ success: true, lastSyncAt: updated?.lastSyncAt });
  } catch (err) {
    return NextResponse.json({ error: "Sync failed", details: String(err) }, { status: 500 });
  }
}
