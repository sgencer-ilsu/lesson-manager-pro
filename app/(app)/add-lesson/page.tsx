"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getActiveStudents, quickAddLesson } from "@/lib/data";
import type { Student } from "@/lib/types";
import { toISODate } from "@/lib/utils";

export default function AddLessonPage() {
  const sb = createClient();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState(0);
  const [date, setDate] = useState(toISODate(new Date()));
  const [time, setTime] = useState("16:00");
  const [topic, setTopic] = useState("");
  const [fee, setFee] = useState("");
  const [paid, setPaid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getActiveStudents(sb).then((rows) => {
      setStudents(rows);
      if (rows.length) {
        setStudentId(rows[0].id);
        setFee(String(rows[0].fee || ""));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStudentChange(id: number) {
    setStudentId(id);
    const s = students.find((s) => s.id === id);
    setFee(s ? String(s.fee || "") : "");
  }

  async function save() {
    if (!studentId) return;
    setSaving(true);
    setDone(false);
    try {
      await quickAddLesson(sb, { studentId, date, time, topic, fee: parseFloat(fee || "0") || 0, paid });
      setTopic("");
      setFee(students.find((s) => s.id === studentId)?.fee ? String(students.find((s) => s.id === studentId)!.fee) : "");
      setPaid(false);
      setDone(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[900px]">
      <h1 className="text-2xl font-bold text-white mb-6">Ders Ekle</h1>
      <div className="card p-6">
        <div className="grid grid-cols-5 gap-4 mb-5">
          <div>
            <label className="block text-xs text-muted mb-1">Öğrenci</label>
            <select className="input" value={studentId} onChange={(e) => handleStudentChange(Number(e.target.value))}>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Tarih</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Saat</label>
            <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Konu</label>
            <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Tutar</label>
            <input className="input" placeholder="Öğrenciden otomatik gelir" value={fee} onChange={(e) => setFee(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
            Ödendi
          </label>
          <button className="btn-primary" onClick={save} disabled={saving || !studentId}>
            {saving ? "Kaydediliyor…" : "Dersi Kaydet"}
          </button>
        </div>
        {done && <p className="text-sm text-emerald-400 mt-4">Ders kaydedildi.</p>}
      </div>
    </div>
  );
}
