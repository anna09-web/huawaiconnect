"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, ChevronDown, ChevronUp, Key } from "lucide-react";
import Link from "next/link";

interface Endpoint {
  method: string;
  path: string;
  description: string;
  params: Array<{ name: string; type: string; desc: string }>;
  example: string;
  response: string;
}

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
}

export function ApiDocsClient({
  keys,
  endpoints,
  baseUrl,
}: {
  keys: ApiKey[];
  endpoints: Endpoint[];
  baseUrl: string;
}) {
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);
  const [copied, setCopied] = useState<string | null>(null);

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function getExampleWithKey(example: string) {
    if (selectedKey) {
      return example
        .replace("hwh_yourkey", selectedKey)
        .replace("https://yourapp.com", baseUrl);
    }
    return example.replace("https://yourapp.com", baseUrl);
  }

  return (
    <div className="space-y-6">
      {/* Auth section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            All requests must include your API key in the Authorization header:
          </p>
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400">
            Authorization: Bearer hwh_yourapikey...
          </div>

          {keys.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Test with your key:</p>
              <div className="flex flex-wrap gap-2">
                {keys.map((k) => (
                  <button
                    key={k.id}
                    onClick={() => setSelectedKey(selectedKey === k.keyPrefix + "..." ? "" : k.keyPrefix + "...")}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      selectedKey === k.keyPrefix + "..."
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {k.name} ({k.keyPrefix}…)
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
              <Key className="h-4 w-4" />
              <span>No API keys yet.</span>
              <Link href="/dashboard/keys" className="text-blue-600 hover:underline">
                Create one
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-yellow-50 rounded-lg p-3">
              <div className="font-semibold text-yellow-800">Rate Limit</div>
              <div className="text-yellow-700">100 requests/hour per key</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="font-semibold text-blue-800">Response Format</div>
              <div className="text-blue-700">JSON with pagination</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="font-semibold text-green-800">Headers</div>
              <div className="text-green-700">X-RateLimit-Remaining</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <div className="space-y-3">
        {endpoints.map((ep, idx) => (
          <Card key={ep.path} className="overflow-hidden">
            <button
              className="w-full text-left"
              onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            >
              <CardHeader className="py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="default" className="font-mono text-xs">
                      {ep.method}
                    </Badge>
                    <code className="text-sm font-mono text-gray-900">{ep.path}</code>
                    <span className="text-sm text-gray-500 hidden sm:block">{ep.description}</span>
                  </div>
                  {expandedIdx === idx ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </CardHeader>
            </button>

            {expandedIdx === idx && (
              <CardContent className="border-t border-gray-100 space-y-5">
                <p className="text-sm text-gray-600">{ep.description}</p>

                {ep.params.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Query Parameters</h4>
                    <div className="rounded-lg border border-gray-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-4 py-2 text-gray-600 font-medium">Name</th>
                            <th className="text-left px-4 py-2 text-gray-600 font-medium">Type</th>
                            <th className="text-left px-4 py-2 text-gray-600 font-medium">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ep.params.map((p) => (
                            <tr key={p.name} className="border-t border-gray-100">
                              <td className="px-4 py-2 font-mono text-blue-600">{p.name}</td>
                              <td className="px-4 py-2 text-gray-500">{p.type}</td>
                              <td className="px-4 py-2 text-gray-600">{p.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-700">Example Request</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => copyText(getExampleWithKey(ep.example), `example-${idx}`)}
                      >
                        {copied === `example-${idx}` ? (
                          <Check className="h-3 w-3 mr-1 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3 mr-1" />
                        )}
                        Copy
                      </Button>
                    </div>
                    <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto">
                      {getExampleWithKey(ep.example)}
                    </pre>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-700">Example Response</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => copyText(ep.response, `response-${idx}`)}
                      >
                        {copied === `response-${idx}` ? (
                          <Check className="h-3 w-3 mr-1 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3 mr-1" />
                        )}
                        Copy
                      </Button>
                    </div>
                    <pre className="bg-gray-900 text-blue-300 rounded-lg p-4 text-xs overflow-x-auto">
                      {ep.response}
                    </pre>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
