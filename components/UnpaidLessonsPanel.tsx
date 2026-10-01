"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUnpaidLessons, updateLessonsPaid, type UnpaidStudentRow } from "@/lib/data";
import { money } from "@/lib/utils";

export default function UnpaidLessonsPanel() {
  const sb = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<UnpaidStudentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { rows: r, total: t } = await getUnpaidLessons(sb);
    setRows(r);
    setTotal(t);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markPaid(row: UnpaidStudentRow) {
    // Optimistic: önce arayüzden kaldır, sonra o öğrencinin TÜM
    // geçmiş ödenmemiş derslerini (lessonIds) tek seferde ödendi yap.
    setRows((rs) => rs.filter((r) => r.student_id !== row.student_id));
    setTotal((t) => t - row.total);
    await updateLessonsPaid(sb, row.lessonIds, true);
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-white">Geçmişten Kalan Ödenmemiş Dersler</h2>
          <p className="text-xs text-muted mt-0.5">önceki aylardan, hâlâ tahsil edilmemiş borçlar · öğrenci bazında</p>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-muted">Toplam</div>
          <div className="text-lg font-bold text-amber-300">{money(total)}</div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Yükleniyor…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">Geçmişten kalan ödenmemiş ders yok 🎉</p>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto pr-1">
          {rows.map((r) => (
            <div key={r.student_id} className="flex items-center gap-3 rounded-lg border border-[#1f2a40] bg-[#101828] px-3 py-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white truncate">
                  {r.student_name} <span className="text-[11px] text-muted font-normal">({r.count} ders)</span>
                </div>
              </div>
              <div className="text-sm font-semibold text-amber-300 shrink-0">{money(r.total)}</div>
              <button
                onClick={() => markPaid(r)}
                className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-900/40 text-emerald-300 hover:brightness-110 shrink-0"
                title="Tüm geçmiş borcunu ödendi olarak işaretle"
              >
                Ödendi işaretle
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
