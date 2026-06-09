import NextAuth, { type NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  // NEXTAUTH_SECRET is required. For Vercel preview deployments without the env var set,
  // we derive a fallback from VERCEL_URL so the app at least loads.
  secret:
    process.env.NEXTAUTH_SECRET ||
    (process.env.VERCEL_URL ? `preview-${process.env.VERCEL_URL}` : undefined),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "placeholder",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder",
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "placeholder",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "placeholder",
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER || "smtp://localhost:1025",
      from: process.env.EMAIL_FROM || "noreply@huaweiconnect.dev",
    }),
  ],
  session: { strategy: "database" },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
