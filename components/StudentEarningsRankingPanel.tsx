"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getStudentEarningsRanking, type StudentEarningRow } from "@/lib/data";
import { money, monthKey, TR_MONTHS } from "@/lib/utils";

export default function StudentEarningsRankingPanel() {
  const sb = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<StudentEarningRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const r = await getStudentEarningsRanking(sb, monthKey());
    setRows(r);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = new Date();
  const monthLabel = `${TR_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  const maxTotal = rows.length ? rows[0].total : 0;
  const grandTotal = rows.reduce((a, r) => a + r.total, 0);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-white">Öğrenci Kazanç Sıralaması</h2>
          <p className="text-xs text-muted mt-0.5">{monthLabel} · bu ay planlanan tüm derslere göre, en çok kazandırandan en aza</p>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-muted">Toplam</div>
          <div className="text-lg font-bold text-emerald-300">{money(grandTotal)}</div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Yükleniyor…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">Bu ay için planlanmış ders yok.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
          {rows.map((r, i) => {
            const pct = maxTotal ? Math.max(6, Math.round((r.total / maxTotal) * 100)) : 0;
            return (
              <div key={r.student_id} className="flex items-center gap-3">
                <div className="w-5 text-right text-xs font-bold text-muted shrink-0">{i + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                      <span className="text-sm font-semibold text-white truncate">{r.student_name}</span>
                      <span className="text-[11px] text-muted shrink-0">({r.count} ders)</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-300 shrink-0">{money(r.total)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#101828] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: r.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
