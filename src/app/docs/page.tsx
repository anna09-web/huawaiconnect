import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { ApiDocsClient } from "./ApiDocsClient";

const endpoints = [
  {
    method: "GET",
    path: "/api/v1/steps",
    description: "Daily step counts",
    params: [
      { name: "from", type: "string", desc: "Start date (YYYY-MM-DD or ISO)" },
      { name: "to", type: "string", desc: "End date (YYYY-MM-DD or ISO)" },
      { name: "page", type: "number", desc: "Page number (default: 1)" },
      { name: "limit", type: "number", desc: "Results per page (default: 100, max: 1000)" },
    ],
    example: `curl -H "Authorization: Bearer hwh_yourkey" \\
  "https://yourapp.com/api/v1/steps?from=2024-01-01&to=2024-01-31"`,
    response: `{
  "data": [
    { "timestamp": "2024-01-01T00:00:00.000Z", "value": 8432, "unit": "count" },
    { "timestamp": "2024-01-02T00:00:00.000Z", "value": 12105, "unit": "count" }
  ],
  "meta": { "total": 31, "page": 1, "limit": 100, "from": "...", "to": "..." }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/heart-rate",
    description: "Heart rate measurements over time",
    params: [
      { name: "from", type: "string", desc: "Start date" },
      { name: "to", type: "string", desc: "End date" },
      { name: "page", type: "number", desc: "Page number" },
      { name: "limit", type: "number", desc: "Results per page" },
    ],
    example: `curl -H "Authorization: Bearer hwh_yourkey" \\
  "https://yourapp.com/api/v1/heart-rate?from=2024-01-01"`,
    response: `{
  "data": [
    { "timestamp": "2024-01-01T08:00:00.000Z", "value": 72, "unit": "bpm" },
    { "timestamp": "2024-01-01T08:05:00.000Z", "value": 75, "unit": "bpm" }
  ],
  "meta": { "total": 2840, "page": 1, "limit": 100 }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/sleep",
    description: "Sleep sessions with stages breakdown",
    params: [
      { name: "from", type: "string", desc: "Start date" },
      { name: "to", type: "string", desc: "End date" },
    ],
    example: `curl -H "Authorization: Bearer hwh_yourkey" \\
  "https://yourapp.com/api/v1/sleep?from=2024-01-01"`,
    response: `{
  "data": [
    {
      "startTime": "2024-01-01T23:15:00.000Z",
      "endTime": "2024-01-02T07:30:00.000Z",
      "durationMins": 495,
      "stages": { "deep": 82, "light": 265, "rem": 110, "awake": 38 },
      "quality": 78
    }
  ],
  "meta": { "total": 30, "page": 1, "limit": 100 }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/calories",
    description: "Daily calorie burn",
    params: [
      { name: "from", type: "string", desc: "Start date" },
      { name: "to", type: "string", desc: "End date" },
    ],
    example: `curl -H "Authorization: Bearer hwh_yourkey" \\
  "https://yourapp.com/api/v1/calories?from=2024-01-01"`,
    response: `{
  "data": [
    { "timestamp": "2024-01-01T00:00:00.000Z", "value": 2350, "unit": "kcal" }
  ],
  "meta": { "total": 31, "page": 1, "limit": 100 }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/activities",
    description: "Workout and activity sessions",
    params: [
      { name: "from", type: "string", desc: "Start date" },
      { name: "to", type: "string", desc: "End date" },
    ],
    example: `curl -H "Authorization: Bearer hwh_yourkey" \\
  "https://yourapp.com/api/v1/activities"`,
    response: `{
  "data": [
    {
      "id": "cuid123",
      "type": "running",
      "startTime": "2024-01-01T07:00:00.000Z",
      "endTime": "2024-01-01T07:45:00.000Z",
      "durationMins": 45,
      "calories": 480,
      "distance": 7200,
      "avgHeartRate": 158,
      "steps": 6800
    }
  ],
  "meta": { "total": 12, "page": 1, "limit": 100 }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/summary/today",
    description: "All health metrics aggregated for today",
    params: [],
    example: `curl -H "Authorization: Bearer hwh_yourkey" \\
  "https://yourapp.com/api/v1/summary/today"`,
    response: `{
  "date": "2024-01-15",
  "steps": { "total": 9823 },
  "heartRate": { "avg": 68, "min": 52, "max": 142 },
  "calories": { "total": 2180 },
  "spo2": { "value": 98, "measuredAt": "2024-01-15T08:00:00.000Z" },
  "stress": { "value": 35, "measuredAt": "2024-01-15T10:00:00.000Z" },
  "sleep": { "startTime": "...", "endTime": "...", "durationMins": 480, "stages": {...} },
  "activities": [{ "type": "walking", "durationMins": 22, "calories": 180 }]
}`,
  },
  {
    method: "GET",
    path: "/api/v1/summary/week",
    description: "Weekly aggregated health metrics",
    params: [],
    example: `curl -H "Authorization: Bearer hwh_yourkey" \\
  "https://yourapp.com/api/v1/summary/week"`,
    response: `{
  "weekStart": "2024-01-08",
  "weekEnd": "2024-01-14",
  "summary": {
    "totalSteps": 68400,
    "totalCalories": 15200,
    "activeDays": 6,
    "avgSleepMins": 462
  },
  "daily": [
    { "date": "2024-01-08", "steps": 11200, "calories": 2400, "avgHeartRate": 72, "activities": 1 }
  ]
}`,
  },
];

export default async function DocsPage() {
  const session = await getServerSession(authOptions);
  let keys: Array<{ id: string; name: string; keyPrefix: string }> = [];

  if (session?.user?.id) {
    keys = await prisma.apiKey.findMany({
      where: { userId: session.user.id as string, revokedAt: null },
      select: { id: true, name: true, keyPrefix: true },
      orderBy: { createdAt: "desc" },
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">API Documentation</h1>
          <p className="text-gray-500 mt-2">
            Access your Huawei Health data via REST API. Authenticate using{" "}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">Authorization: Bearer &lt;api_key&gt;</code>
          </p>
        </div>

        <ApiDocsClient keys={keys} endpoints={endpoints} baseUrl={process.env.NEXTAUTH_URL || "https://yourapp.com"} />
      </div>
    </div>
  );
}
