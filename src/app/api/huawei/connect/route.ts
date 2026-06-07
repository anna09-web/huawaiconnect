import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthorizationUrl } from "@/lib/huawei-api";
import { randomBytes } from "crypto";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = randomBytes(16).toString("hex");
  const url = getAuthorizationUrl(state);

  const response = NextResponse.redirect(url);
  response.cookies.set("huawei_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    sameSite: "lax",
  });

  return response;
}
