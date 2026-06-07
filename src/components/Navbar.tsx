"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Activity, Key, BookOpen, LogOut, User } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 font-bold text-gray-900">
              <Activity className="h-5 w-5 text-blue-600" />
              HuaweiConnect
            </Link>
            {session && (
              <div className="hidden sm:flex items-center gap-1">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    <Activity className="h-4 w-4 mr-1" />
                    Dashboard
                  </Button>
                </Link>
                <Link href="/dashboard/keys">
                  <Button variant="ghost" size="sm">
                    <Key className="h-4 w-4 mr-1" />
                    API Keys
                  </Button>
                </Link>
                <Link href="/docs">
                  <Button variant="ghost" size="sm">
                    <BookOpen className="h-4 w-4 mr-1" />
                    API Docs
                  </Button>
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <>
                <div className="flex items-center gap-2 text-sm text-gray-600 hidden sm:flex">
                  <User className="h-4 w-4" />
                  {session.user?.name || session.user?.email}
                </div>
                <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                  <LogOut className="h-4 w-4 mr-1" />
                  Sign out
                </Button>
              </>
            ) : (
              <Link href="/auth/signin">
                <Button size="sm">Sign in</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
