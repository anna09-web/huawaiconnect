"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, Plus, Trash2, Key, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface ApiKeyManagerProps {
  initialKeys: ApiKey[];
}

export function ApiKeyManager({ initialKeys }: ApiKeyManagerProps) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpiry, setNewKeyExpiry] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function createKey() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          expiresAt: newKeyExpiry || undefined,
        }),
      });
      const data = await res.json();
      setCreatedKey(data.key);
      setKeys((prev) => [data.apiKey, ...prev]);
      setNewKeyName("");
      setNewKeyExpiry("");
    } catch {}
    finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    setKeys((prev) => prev.map((k) => k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k));
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const activeKeys = keys.filter((k) => !k.revokedAt);
  const revokedKeys = keys.filter((k) => k.revokedAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">API Keys</h2>
          <p className="text-sm text-gray-500 mt-1">
            Generate keys to access your health data from external tools
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              New API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
            </DialogHeader>
            {createdKey ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                  <p className="text-sm font-medium">Key created! Copy it now — it won&apos;t be shown again.</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono break-all">
                    {createdKey}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(createdKey)}
                  >
                    {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  className="w-full"
                  onClick={() => { setCreatedKey(null); setDialogOpen(false); }}
                >
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Name</label>
                  <Input
                    placeholder="e.g. My Grafana Dashboard"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createKey()}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Expiry date <span className="text-gray-400">(optional)</span>
                  </label>
                  <Input
                    type="datetime-local"
                    value={newKeyExpiry}
                    onChange={(e) => setNewKeyExpiry(e.target.value ? new Date(e.target.value).toISOString() : "")}
                  />
                </div>
                <Button className="w-full" onClick={createKey} disabled={creating || !newKeyName.trim()}>
                  {creating ? "Creating…" : "Create Key"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {activeKeys.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Key className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No API keys yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeKeys.map((key) => (
            <Card key={key.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Key className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{key.name}</span>
                        <Badge variant="success">Active</Badge>
                        {key.expiresAt && (
                          <Badge variant="outline" className="text-xs">
                            Expires {format(new Date(key.expiresAt), "MMM d, yyyy")}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 font-mono">
                        {key.keyPrefix}••••••••••••••••••••
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-xs text-gray-400 hidden sm:block">
                      {key.lastUsedAt ? (
                        <span>Last used {format(new Date(key.lastUsedAt), "MMM d, HH:mm")}</span>
                      ) : (
                        <span>Never used</span>
                      )}
                      <br />
                      Created {format(new Date(key.createdAt), "MMM d, yyyy")}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => revokeKey(key.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {revokedKeys.length > 0 && (
        <details className="mt-6">
          <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-600">
            {revokedKeys.length} revoked key{revokedKeys.length !== 1 ? "s" : ""}
          </summary>
          <div className="mt-3 space-y-2">
            {revokedKeys.map((key) => (
              <Card key={key.id} className="opacity-50">
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-500 line-through">{key.name}</span>
                    <Badge variant="destructive">Revoked</Badge>
                    <span className="text-xs text-gray-400">
                      {key.revokedAt && format(new Date(key.revokedAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
