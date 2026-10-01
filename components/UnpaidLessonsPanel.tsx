"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUnpaidLessons, updateLessonPaid, type UnpaidLessonRow } from "@/lib/data";
import { money, monthKey, TR_MONTHS } from "@/lib/utils";

export default function UnpaidLessonsPanel() {
  const sb = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<UnpaidLessonRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { rows: r, total: t } = await getUnpaidLessons(sb, monthKey());
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

  async function markPaid(row: UnpaidLessonRow) {
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    setTotal((t) => t - row.fee);
    await updateLessonPaid(sb, row.id, true);
  }

  const now = new Date();
  const monthLabel = `${TR_MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-white">Ödenmemiş Dersler</h2>
          <p className="text-xs text-muted mt-0.5">{monthLabel} · ödeme bekleyen gerçekleşmiş dersler</p>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-muted">Toplam</div>
          <div className="text-lg font-bold text-amber-300">{money(total)}</div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Yükleniyor…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">Bu ay ödenmemiş ders yok 🎉</p>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto pr-1">
          {rows.map((r) => {
            const d = new Date(`${r.lesson_date}T00:00:00`);
            const dateLabel = `${d.getDate()} ${TR_MONTHS[d.getMonth()].slice(0, 3)}`;
            return (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border border-[#1f2a40] bg-[#101828] px-3 py-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white truncate">{r.student_name}</div>
                  <div className="text-[11px] text-muted">
                    {dateLabel} · {r.lesson_time}
                  </div>
                </div>
                <div className="text-sm font-semibold text-amber-300 shrink-0">{money(r.fee)}</div>
                <button
                  onClick={() => markPaid(r)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-900/40 text-emerald-300 hover:brightness-110 shrink-0"
                  title="Ödendi olarak işaretle"
                >
                  Ödendi işaretle
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
