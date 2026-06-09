import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checks: Record<string, string> = {
    nextauth_secret: process.env.NEXTAUTH_SECRET || process.env.VERCEL_URL ? "ok" : "missing",
    database_url: process.env.DATABASE_URL ? "configured" : "missing",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "connected";
  } catch (e) {
    checks.database = `error: ${String(e).slice(0, 100)}`;
  }

  const allOk = checks.database === "connected";
  return NextResponse.json({ ok: allOk, checks }, { status: allOk ? 200 : 503 });
}
