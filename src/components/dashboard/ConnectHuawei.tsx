"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Link2 } from "lucide-react";

export function ConnectHuawei() {
  return (
    <Link href="/api/huawei/connect">
      <Button className="bg-red-600 hover:bg-red-700">
        <Link2 className="h-4 w-4 mr-1" />
        Connect Huawei Health
      </Button>
    </Link>
  );
}
