import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateApiKey, hashApiKey } from "@/lib/api-key";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresAt: z.string().datetime().optional(),
});

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const { key, prefix } = generateApiKey();
  const keyHash = await hashApiKey(key);

  const apiKey = await prisma.apiKey.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      keyHash,
      keyPrefix: prefix,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
    select: { id: true, name: true, keyPrefix: true, expiresAt: true, createdAt: true },
  });

  return NextResponse.json({ key, apiKey }, { status: 201 });
}
