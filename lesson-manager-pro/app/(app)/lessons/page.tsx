"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getStudents, getLessonRows, updateLessonTopic, updatePlannedTopic, updateLessonPaid, updatePlannedPaid, type LessonRow } from "@/lib/data";
import { exportCSV, exportPDF } from "@/lib/export";
import type { Student } from "@/lib/types";
import { money, monthKey } from "@/lib/utils";
import MonthPicker from "@/components/MonthPicker";

function StatChip({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "amber" | "red" }) {
  const valueColor = tone === "emerald" ? "text-emerald-300" : tone === "amber" ? "text-amber-300" : tone === "red" ? "text-red-300" : "text-white";
  return (
    <div className="rounded-xl border border-[#1f2a40] bg-[#101828] px-4 py-2.5 min-w-[110px]">
      <div className="text-[11px] text-muted font-medium">{label}</div>
      <div className={`text-base font-bold ${valueColor}`}>{value}</div>
    </div>
  );
}

export default function LessonsPage() {
  const sb = createClient();
  const [students, setStudents] = useState<Student[]>([]);
  const [month, setMonth] = useState(monthKey());
  const [studentId, setStudentId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"Tümü" | "Yapıldı" | "Planlandı">("Tümü");
  const [paidFilter, setPaidFilter] = useState<"Tümü" | "Ödendi" | "Ödenmedi">("Tümü");
  const [rows, setRows] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Pasif öğrenciler de dahil: o ayki ders/ödeme geçmişini görebilmek için
    // filtre listesinde pasif öğrenciler de yer almalı (sadece takvime ders
    // eklerken gizleniyorlar, bkz. LessonFormDialog).
    getStudents(sb).then(setStudents);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function filter() {
    setLoading(true);
    try {
      setRows(await getLessonRows(sb, month, studentId, statusFilter, paidFilter));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    filter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, studentId, statusFilter, paidFilter]);

  async function toggleTopic(row: LessonRow, newTopic: string) {
    if (row.row_type === "lesson") {
      await updateLessonTopic(sb, row.row_id, newTopic);
    } else {
      await updatePlannedTopic(sb, row.row_id, newTopic);
    }
    setRows((rs) => rs.map((r) => (r === row ? { ...r, topic: newTopic } : r)));
  }

  // Durum (yapıldı/planlandı) ile ödeme birbirinden bağımsızdır: henüz
  // yapılmamış bir ders de peşin ödenmiş olabilir, bu yüzden ödeme butonu
  // hem "lesson" hem "planned" satırlarında çalışır.
  async function togglePaid(row: LessonRow) {
    const next = !row.paid;
    if (row.row_type === "lesson") {
      await updateLessonPaid(sb, row.row_id, next);
    } else {
      await updatePlannedPaid(sb, row.row_id, next);
    }
    setRows((rs) => rs.map((r) => (r === row ? { ...r, paid: next } : r)));
  }

  const total = rows.reduce((a, r) => a + (r.fee || 0), 0);
  const done = rows.filter((r) => r.row_type === "lesson").reduce((a, r) => a + (r.fee || 0), 0);
  const planned = rows.filter((r) => r.row_type === "planned").reduce((a, r) => a + (r.fee || 0), 0);
  const paid = rows.filter((r) => r.paid).reduce((a, r) => a + (r.fee || 0), 0);
  const unpaid = rows.filter((r) => !r.paid).reduce((a, r) => a + (r.fee || 0), 0);
  const studentName = studentId ? students.find((s) => s.id === studentId)?.name || null : null;

  return (
    <div className="max-w-[1200px] space-y-5">
      <h1 className="text-2xl font-bold text-white">Dersler</h1>

      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-muted mb-1.5">Ay</label>
            <MonthPicker value={month} onChange={setMonth} />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Öğrenci</label>
            <select className="input w-[180px]" value={studentId ?? 0} onChange={(e) => setStudentId(Number(e.target.value) || null)}>
              <option value={0}>Tümü</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {!s.active ? " (Pasif)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Durum</label>
            <select className="input w-[130px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
              <option>Tümü</option>
              <option>Yapıldı</option>
              <option>Planlandı</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Ödeme</label>
            <select className="input w-[130px]" value={paidFilter} onChange={(e) => setPaidFilter(e.target.value as any)}>
              <option>Tümü</option>
              <option>Ödendi</option>
              <option>Ödenmedi</option>
            </select>
          </div>

          <div className="flex gap-2 ml-auto">
            <button className="btn-primary" onClick={filter} disabled={loading}>
              {loading ? "Filtreleniyor…" : "Filtrele"}
            </button>
            <button className="btn" onClick={() => exportCSV(rows, `ders_raporu_${month}.csv`)}>
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
        <StatChip label="Yapılan" value={money(done)} tone="emerald" />
        <StatChip label="Planlanan" value={money(planned)} tone="amber" />
        <StatChip label="Ödendi" value={money(paid)} tone="emerald" />
        <StatChip label="Ödenmedi" value={money(unpaid)} tone="red" />
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
              <th>Ödeme</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.row_type}-${r.row_id}`} className={r.row_type === "planned" ? "opacity-60" : ""}>
                <td>{r.lesson_date}</td>
                <td>{r.lesson_time}</td>
                <td>{r.name}</td>
                <td>{r.school}</td>
                <td>{r.subject}</td>
                <td>
                  <input
                    key={`${r.row_type}-${r.row_id}-${r.topic}`}
                    className="bg-transparent border-b border-transparent hover:border-[#2a3d63] focus:border-accent outline-none w-full"
                    defaultValue={r.topic}
                    placeholder="—"
                    onBlur={(e) => toggleTopic(r, e.target.value)}
                  />
                </td>
                <td>{money(r.fee)}</td>
                <td>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      r.row_type === "lesson" ? "bg-blue-900/40 text-blue-300" : "bg-[#1f2a40] text-muted"
                    }`}
                  >
                    {r.row_type === "lesson" ? "Yapıldı" : "Planlandı"}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => togglePaid(r)}
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${r.paid ? "bg-emerald-900/40 text-emerald-300" : "bg-amber-900/40 text-amber-300"}`}
                    title="Ödeme durumunu değiştirmek için tıkla"
                  >
                    {r.paid ? "Ödendi" : "Ödenmedi"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="text-sm text-muted p-5">Kayıt bulunamadı.</p>}
      </div>
    </div>
  );
}
