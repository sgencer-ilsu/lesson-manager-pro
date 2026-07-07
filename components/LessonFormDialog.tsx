"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Student, CalendarEvent } from "@/lib/types";
import { getActiveStudents } from "@/lib/data";
import { addDays, toISODate } from "@/lib/utils";

type NewMode = { mode: "new"; date: Date; time: string | null };
type EditMode = { mode: "edit"; event: CalendarEvent };

export default function LessonFormDialog({
  target,
  onClose,
  onSave,
  onDelete,
}: {
  target: NewMode | EditMode;
  onClose: () => void;
  onSave: (fields: { studentId: number; date: string; time: string; fee: number; note: string; recurring: boolean; recurrenceEnd: string | null }) => void;
  onDelete?: () => void;
}) {
  const sb = createClient();
  const [students, setStudents] = useState<Student[]>([]);
  const isEdit = target.mode === "edit";

  const initial = isEdit
    ? {
        studentId: (target as EditMode).event.student_id,
        date: (target as EditMode).event.lesson_date,
        time: (target as EditMode).event.lesson_time,
        fee: (target as EditMode).event.fee,
        note: (target as EditMode).event.topic,
      }
    : {
        studentId: 0,
        date: toISODate((target as NewMode).date),
        time: (target as NewMode).time || "16:00",
        fee: 0,
        note: "",
      };

  const [studentId, setStudentId] = useState(initial.studentId);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [fee, setFee] = useState(String(initial.fee || ""));
  const [note, setNote] = useState(initial.note);
  const [recurring, setRecurring] = useState(false);
  const [recurrenceEnd, setRecurrenceEnd] = useState(toISODate(addDays(new Date(), 182)));

  useEffect(() => {
    getActiveStudents(sb).then((rows) => {
      setStudents(rows);
      if (!isEdit && rows.length && !studentId) {
        setStudentId(rows[0].id);
        if (!fee) setFee(String(rows[0].fee || ""));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStudentChange(id: number) {
    setStudentId(id);
    const s = students.find((s) => s.id === id);
    if (s && !isEdit) setFee(String(s.fee || ""));
  }

  function submit() {
    if (!studentId) return;
    onSave({
      studentId,
      date,
      time,
      fee: parseFloat(fee || "0") || 0,
      note,
      recurring,
      recurrenceEnd: recurring ? recurrenceEnd : null,
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-white font-bold mb-4">{isEdit ? "Dersi Düzenle" : "Yeni Ders"}</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted mb-1">Öğrenci</label>
            <select className="input" value={studentId} onChange={(e) => handleStudentChange(Number(e.target.value))}>
              <option value={0} disabled>
                Öğrenci seçin
              </option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-muted mb-1">Tarih</label>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-muted mb-1">Saat</label>
              <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Tutar</label>
            <input className="input" placeholder="Öğrenciden otomatik gelir" value={fee} onChange={(e) => setFee(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Konu / Not</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Konu / not" />
          </div>

          {!isEdit && (
            <>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
                Her hafta tekrar et
              </label>
              {recurring && (
                <div>
                  <label className="block text-xs text-muted mb-1">Tekrar bitiş</label>
                  <input type="date" className="input" value={recurrenceEnd} onChange={(e) => setRecurrenceEnd(e.target.value)} />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button className="btn-primary flex-1" onClick={submit} disabled={!studentId}>
            Kaydet
          </button>
          {isEdit && onDelete && (
            <button className="btn-danger" onClick={onDelete}>
              Sil
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );
}
