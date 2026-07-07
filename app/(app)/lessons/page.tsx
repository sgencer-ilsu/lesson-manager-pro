"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getActiveStudents, getLessonRows, updateLessonTopic, updateLessonPaid, type LessonRow } from "@/lib/data";
import { exportCSV, exportPDF } from "@/lib/export";
import type { Student } from "@/lib/types";
import { money, monthKey } from "@/lib/utils";

export default function LessonsPage() {
  const sb = createClient();
  const [students, setStudents] = useState<Student[]>([]);
  const [month, setMonth] = useState(monthKey());
  const [studentId, setStudentId] = useState<number | null>(null);
  const [paidFilter, setPaidFilter] = useState<"Tümü" | "Ödendi" | "Ödenmedi" | "Planlandı">("Tümü");
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

  async function toggleTopic(row: LessonRow, newTopic: string) {
    if (row.row_type !== "lesson") return;
    await updateLessonTopic(sb, row.row_id, newTopic);
    setRows((rs) => rs.map((r) => (r === row ? { ...r, topic: newTopic } : r)));
  }

  async function togglePaid(row: LessonRow) {
    if (row.row_type !== "lesson") return;
    const next = !row.paid;
    await updateLessonPaid(sb, row.row_id, next);
    setRows((rs) => rs.map((r) => (r === row ? { ...r, paid: next } : r)));
  }

  const total = rows.reduce((a, r) => a + (r.fee || 0), 0);
  const done = rows.filter((r) => r.row_type === "lesson").reduce((a, r) => a + (r.fee || 0), 0);
  const planned = rows.filter((r) => r.row_type === "planned").reduce((a, r) => a + (r.fee || 0), 0);
  const studentName = studentId ? students.find((s) => s.id === studentId)?.name || null : null;

  return (
    <div className="max-w-[1200px] space-y-4">
      <h1 className="text-2xl font-bold text-white">Dersler</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-muted mb-1">Ay</label>
          <input className="input w-[130px]" value={month} onChange={(e) => setMonth(e.target.value)} placeholder="YYYY-MM" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Öğrenci</label>
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
          <label className="block text-xs text-muted mb-1">Ödeme</label>
          <select className="input w-[140px]" value={paidFilter} onChange={(e) => setPaidFilter(e.target.value as any)}>
            <option>Tümü</option>
            <option>Ödendi</option>
            <option>Ödenmedi</option>
            <option>Planlandı</option>
          </select>
        </div>
        <button className="btn-primary" onClick={filter} disabled={loading}>
          Filtrele
        </button>
        <button className="btn" onClick={() => exportCSV(rows, `ders_raporu_${month}.csv`)}>
          CSV Aktar
        </button>
        <button className="btn" onClick={() => exportPDF(rows, month, studentName)}>
          PDF Kaydet
        </button>
      </div>

      <p className="text-sm font-semibold text-white">
        Toplam: {money(total)} &nbsp; Yapılan: {money(done)} &nbsp; Planlanan: {money(planned)} &nbsp; Ders: {rows.length}
      </p>

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
                <td>
                  {r.row_type === "lesson" ? (
                    <input
                      className="bg-transparent border-b border-transparent hover:border-[#2a3d63] focus:border-accent outline-none w-full"
                      defaultValue={r.topic}
                      onBlur={(e) => toggleTopic(r, e.target.value)}
                    />
                  ) : (
                    r.topic
                  )}
                </td>
                <td>{money(r.fee)}</td>
                <td>
                  {r.row_type === "planned" ? (
                    "Planlandı"
                  ) : (
                    <button
                      onClick={() => togglePaid(r)}
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${r.paid ? "bg-emerald-900/40 text-emerald-300" : "bg-amber-900/40 text-amber-300"}`}
                      title="Ödeme durumunu değiştirmek için tıkla"
                    >
                      {r.paid ? "Ödendi" : "Ödenmedi"}
                    </button>
                  )}
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
