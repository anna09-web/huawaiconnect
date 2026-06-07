import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exchangeCodeForTokens, syncHealthData } from "@/lib/huawei-api";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent(error)}`, req.url));
  }

  const storedState = req.cookies.get("huawei_oauth_state")?.value;
  if (!state || state !== storedState) {
    return NextResponse.redirect(new URL("/dashboard?error=invalid_state", req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/dashboard?error=no_code", req.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    await prisma.huaweiOAuthToken.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        accessTokenEnc: encrypt(tokens.access_token),
        refreshTokenEnc: encrypt(tokens.refresh_token),
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope,
      },
      update: {
        accessTokenEnc: encrypt(tokens.access_token),
        refreshTokenEnc: encrypt(tokens.refresh_token),
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope,
      },
    });

    syncHealthData(session.user.id).catch(console.error);

    const response = NextResponse.redirect(new URL("/dashboard?connected=true", req.url));
    response.cookies.delete("huawei_oauth_state");
    return response;
  } catch (err) {
    console.error("Huawei OAuth callback error:", err);
    return NextResponse.redirect(new URL("/dashboard?error=token_exchange_failed", req.url));
  }
}
