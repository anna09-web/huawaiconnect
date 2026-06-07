"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface SyncButtonProps {
  lastSyncAt: string | null;
  onSync?: () => void;
}

export function SyncButton({ lastSyncAt, onSync }: SyncButtonProps) {
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(lastSyncAt);

  async function handleSync() {
    setLoading(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (data.lastSyncAt) setLastSync(data.lastSyncAt);
      onSync?.();
    } catch {}
    finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {lastSync && (
        <span className="text-sm text-gray-500">
          Last sync: {format(new Date(lastSync), "MMM d, HH:mm")}
        </span>
      )}
      <Button onClick={handleSync} disabled={loading} size="sm" variant="outline">
        <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Syncing…" : "Sync Now"}
      </Button>
    </div>
  );
}
