"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getActiveStudents, getLessonRows, type LessonRow } from "@/lib/data";
import { exportCSV, exportPDF } from "@/lib/export";
import type { Student } from "@/lib/types";
import { money, monthKey } from "@/lib/utils";

function StatChip({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "amber" | "sky" }) {
  const valueColor = tone === "emerald" ? "text-emerald-300" : tone === "amber" ? "text-amber-300" : tone === "sky" ? "text-sky-300" : "text-white";
  return (
    <div className="rounded-xl border border-[#1f2a40] bg-[#101828] px-4 py-2.5 min-w-[110px]">
      <div className="text-[11px] text-muted font-medium">{label}</div>
      <div className={`text-base font-bold ${valueColor}`}>{value}</div>
    </div>
  );
}

export default function ReportsPage() {
  const sb = createClient();
  const [students, setStudents] = useState<Student[]>([]);
  const [month, setMonth] = useState(monthKey());
  const [studentId, setStudentId] = useState<number | null>(null);
  const [paidFilter, setPaidFilter] = useState<"Tümü" | "Ödendi" | "Ödenmedi">("Tümü");
  const [rows, setRows] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getActiveStudents(sb).then(setStudents);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function filter() {
    setLoading(true);
    try {
      setRows(await getLessonRows(sb, month, studentId, paidFilter));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    filter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = rows.reduce((a, r) => a + (r.fee || 0), 0);
  const paid = rows.filter((r) => r.row_type === "lesson" && r.paid).reduce((a, r) => a + (r.fee || 0), 0);
  const plannedSum = rows.filter((r) => r.row_type === "planned").reduce((a, r) => a + (r.fee || 0), 0);
  const unpaid = total - paid;
  const studentName = studentId ? students.find((s) => s.id === studentId)?.name || null : null;

  return (
    <div className="max-w-[1200px] space-y-5">
      <h1 className="text-2xl font-bold text-white">Raporlar</h1>

      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-muted mb-1.5">Ay</label>
            <input className="input w-[130px]" value={month} onChange={(e) => setMonth(e.target.value)} placeholder="YYYY-MM" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Öğrenci</label>
            <select className="input w-[180px]" value={studentId ?? 0} onChange={(e) => setStudentId(Number(e.target.value) || null)}>
              <option value={0}>Tümü</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Ödeme</label>
            <select className="input w-[140px]" value={paidFilter} onChange={(e) => setPaidFilter(e.target.value as any)}>
              <option>Tümü</option>
              <option>Ödendi</option>
              <option>Ödenmedi</option>
            </select>
          </div>

          <div className="flex gap-2 ml-auto">
            <button className="btn-primary" onClick={filter} disabled={loading}>
              {loading ? "Filtreleniyor…" : "Filtrele"}
            </button>
            <button className="btn" onClick={() => exportCSV(rows, `rapor_${month}.csv`)}>
              CSV Aktar
            </button>
            <button className="btn" onClick={() => exportPDF(rows, month, studentName)}>
              PDF Kaydet
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatChip label="Toplam" value={money(total)} />
        <StatChip label="Ödenen" value={money(paid)} tone="emerald" />
        <StatChip label="Bekleyen / Planlı" value={money(unpaid)} tone="amber" />
        <StatChip label="Planlı" value={money(plannedSum)} tone="sky" />
        <StatChip label="Ders" value={String(rows.length)} />
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Saat</th>
              <th>Öğrenci</th>
              <th>Okul</th>
              <th>Ders</th>
              <th>Konu</th>
              <th>Tutar</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={r.row_type === "planned" ? "opacity-60" : ""}>
                <td>{r.lesson_date}</td>
                <td>{r.lesson_time}</td>
                <td>{r.name}</td>
                <td>{r.school}</td>
                <td>{r.subject}</td>
                <td>{r.topic}</td>
                <td>{money(r.fee)}</td>
                <td>{r.row_type === "planned" ? "Planlandı" : r.paid ? "Ödendi" : "Ödenmedi"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="text-sm text-muted p-5">Kayıt bulunamadı.</p>}
      </div>
    </div>
  );
}
