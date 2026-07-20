"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { getMonthlyEarnings, type MonthlyEarning } from "@/lib/data";
import { TR_MONTHS_SHORT, money } from "@/lib/utils";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl border border-[#26364f] bg-[#101828] px-3 py-2 shadow-xl backdrop-blur-sm">
      <div className="text-[11px] text-muted mb-0.5">{label}</div>
      <div className="text-sm font-bold text-white">{money(payload[0].value)}</div>
    </div>
  );
}

export default function MonthlyEarningsChart() {
  const sb = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<MonthlyEarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMonthlyEarnings(sb)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [sb]);

  const chartData = rows.map((r) => {
    const [y, m] = r.monthKey.split("-").map(Number);
    return { label: `${TR_MONTHS_SHORT[m - 1]} '${String(y).slice(2)}`, total: r.total };
  });

  const currentTotal = rows.length ? rows[rows.length - 1].total : 0;
  const prevTotal = rows.length > 1 ? rows[rows.length - 2].total : 0;
  const diff = currentTotal - prevTotal;
  const diffPct = prevTotal > 0 ? Math.round((diff / prevTotal) * 100) : null;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-0.5">
        <h2 className="text-sm font-bold text-white">Aylık Kazanç Trendi</h2>
        {!loading && diffPct !== null && (
          <span className={`text-xs font-semibold ${diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {diff >= 0 ? "▲" : "▼"} {Math.abs(diffPct)}% geçen aya göre
          </span>
        )}
      </div>
      <div className="text-lg font-bold text-white mb-2">{loading ? "…" : money(currentTotal)}</div>

      {loading ? (
        <div className="h-[150px] flex items-center justify-center text-sm text-muted">Yükleniyor…</div>
      ) : (
        <div className="h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
              <defs>
                <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9333ea" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
                <linearGradient id="barFillLast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1c2740" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} axisLine={{ stroke: "#26364f" }} />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={38}
                tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(124,58,237,0.08)" }} />
              <Bar dataKey="total" radius={[8, 8, 3, 3]} maxBarSize={44} animationDuration={650} animationEasing="ease-out">
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i === chartData.length - 1 ? "url(#barFillLast)" : "url(#barFill)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
