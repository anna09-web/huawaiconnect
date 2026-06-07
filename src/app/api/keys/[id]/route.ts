import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = await prisma.apiKey.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.apiKey.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.name && { name: parsed.data.name }),
      ...(parsed.data.expiresAt !== undefined && {
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      }),
    },
    select: { id: true, name: true, keyPrefix: true, expiresAt: true, revokedAt: true, lastUsedAt: true },
  });

  return NextResponse.json({ key: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = await prisma.apiKey.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.apiKey.update({
    where: { id: params.id },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
