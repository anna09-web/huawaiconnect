import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Activity, Heart, Moon, Zap, Key, Code2, ArrowRight } from "lucide-react";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-gray-900 text-lg">
            <Activity className="h-5 w-5 text-blue-600" />
            HuaweiConnect
          </div>
          <Link href="/auth/signin">
            <Button>Get Started <ArrowRight className="h-4 w-4 ml-1" /></Button>
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium mb-6">
          <Zap className="h-3.5 w-3.5" />
          Huawei Health API Bridge
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Your health data,<br />
          <span className="text-blue-600">accessible anywhere</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Connect your Huawei Health account once. Then access all your health metrics
          from Grafana, n8n, or any tool via a clean REST API.
        </p>
        <div className="flex items-center justify-center gap-4 mb-20">
          <Link href="/auth/signin">
            <Button size="lg" className="text-base px-8">
              Connect Huawei Health
            </Button>
          </Link>
          <Link href="/docs">
            <Button size="lg" variant="outline" className="text-base px-8">
              View API Docs
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-left">
          {[
            { icon: Activity, label: "Steps & Activity", desc: "Daily step counts and workout sessions" },
            { icon: Heart, label: "Heart Rate", desc: "Continuous heart rate monitoring" },
            { icon: Moon, label: "Sleep Analysis", desc: "Stages: deep, light, REM, awake" },
            { icon: Zap, label: "Calories", desc: "Active and total calorie burn" },
            { icon: Key, label: "API Keys", desc: "Secure named keys with expiry dates" },
            { icon: Code2, label: "REST API", desc: "Clean JSON responses with pagination" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <Icon className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">{label}</h3>
              <p className="text-sm text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
