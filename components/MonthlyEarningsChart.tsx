"use client";

import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { getMonthlyEarnings, type MonthlyEarning } from "@/lib/data";
import { TR_MONTHS_SHORT, money } from "@/lib/utils";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-[#26364f] bg-[#101828] px-3 py-2 shadow-lg">
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
    getMonthlyEarnings(sb, 6)
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
    <div className="card p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-bold text-white">Aylık Kazanç Trendi</h2>
        {!loading && diffPct !== null && (
          <span className={`text-xs font-semibold ${diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {diff >= 0 ? "▲" : "▼"} {Math.abs(diffPct)}% geçen aya göre
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-4">{loading ? "…" : money(currentTotal)}</div>

      {loading ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-muted">Yükleniyor…</div>
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="earningsLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#9333ea" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1c2740" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: "#26364f" }} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#2a3d63", strokeWidth: 1 }} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="url(#earningsLine)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#0f172a", stroke: "#7c3aed", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "#7c3aed" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
