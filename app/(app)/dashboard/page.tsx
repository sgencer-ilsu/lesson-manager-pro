"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/Card";
import { WalletIcon, TrendingUpIcon, CheckCircleIcon, CalendarIcon } from "@/components/icons";
import MonthlyEarningsChart from "@/components/MonthlyEarningsChart";
import StudentNotesPanel from "@/components/StudentNotesPanel";
import { getDashboardTotals, materializeDue, ensureRecurringInstances } from "@/lib/data";
import { money, monthKey, TR_DAYS, TR_MONTHS } from "@/lib/utils";

export default function DashboardPage() {
  const sb = createClient();
  const [now, setNow] = useState(new Date());
  const [totals, setTotals] = useState({ planned: 0, earned: 0, paid: 0, count: 0 });

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    await ensureRecurringInstances(sb);
    await materializeDue(sb);
    fetch("/api/google/resync", { method: "POST" }).catch(() => {});
    const tot = await getDashboardTotals(sb, monthKey());
    setTotals(tot);
  }, [sb]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="space-y-4 max-w-[1200px]">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span>
            {now.getDate()} {TR_MONTHS[now.getMonth()]} {now.getFullYear()} • {TR_DAYS[(now.getDay() + 6) % 7]}
          </span>
          <span className="font-mono">{now.toLocaleTimeString("tr-TR")}</span>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Card title="Tahmini Aylık Gelir" value={money(totals.planned)} subtitle="Bu ay planlanan" icon={<WalletIcon />} accent="#2563eb" />
        <Card title="Bugüne Kadar Hakediş" value={money(totals.earned)} subtitle="Zamanı gelen dersler" icon={<TrendingUpIcon />} accent="#22c55e" />
        <Card title="Tahsil Edilen" value={money(totals.paid)} subtitle="Ödenen" icon={<CheckCircleIcon />} accent="#f59e0b" />
        <Card title="Planlanan Ders" value={String(totals.count)} subtitle="Bu ay" icon={<CalendarIcon />} accent="#9333ea" />
      </div>

      <MonthlyEarningsChart />

      <StudentNotesPanel />
    </div>
  );
}
