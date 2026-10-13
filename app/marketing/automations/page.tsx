"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export default function MarketingAutomationsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to the unified WhatsApp Automation Center
    router.replace("/manage/whatsapp-config?tab=smart-campaigns");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-slate-200 shadow-sm text-center p-8 bg-white rounded-2xl space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
          <Sparkles className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">
            Moving to WhatsApp Control Center
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            All AI automated campaign flows and WhatsApp triggers have been unified inside your WhatsApp Control Center.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Redirecting automatically...</span>
        </div>

        <Button asChild className="w-full bg-slate-900 hover:bg-slate-800 text-white gap-2 h-10 rounded-xl">
          <Link href="/manage/whatsapp-config?tab=smart-campaigns">
            <span>Open WhatsApp Control Center</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </Card>
    </div>
  );
}
