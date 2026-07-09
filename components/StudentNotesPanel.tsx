"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getActiveStudents, getStudentLessonHistory, updateLessonNotes, type StudentLessonNote } from "@/lib/data";
import type { Student } from "@/lib/types";
import { TR_MONTHS, addMinutesToTime, DURATION_MIN, parseISODate } from "@/lib/utils";

export default function StudentNotesPanel() {
  const sb = useMemo(() => createClient(), []);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [history, setHistory] = useState<StudentLessonNote[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getActiveStudents(sb).then((rows) => {
      setStudents(rows);
      if (rows.length) setStudentId(rows[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    getStudentLessonHistory(sb, studentId)
      .then((rows) => {
        setHistory(rows);
        setLoading(false);
        // İlk açılışta her zaman en güncel dersi göster (en alta kaydır).
        requestAnimationFrame(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        });
      })
      .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, sb]);

  async function saveNote(lessonId: number, notes: string) {
    setHistory((rows) => rows.map((r) => (r.id === lessonId ? { ...r, notes } : r)));
    await updateLessonNotes(sb, lessonId, notes);
  }

  function formatDate(dateISO: string) {
    const d = parseISODate(dateISO);
    return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  return (
    <div className="card p-5 flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between mb-4 shrink-0 gap-3">
        <h2 className="text-sm font-bold text-white whitespace-nowrap shrink-0">Ders Notlarım</h2>
        <select
          className="input w-[170px]"
          value={studentId ?? 0}
          onChange={(e) => setStudentId(Number(e.target.value) || null)}
        >
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
        {loading ? (
          <p className="text-sm text-muted">Yükleniyor…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted">Bu öğrenci için henüz yapılmış ders yok.</p>
        ) : (
          history.map((lesson) => (
            <div key={lesson.id} className="rounded-xl border border-[#1f2a40] bg-[#0e1626] p-3.5">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs font-semibold text-white">
                  {formatDate(lesson.lesson_date)} · {lesson.lesson_time} – {addMinutesToTime(lesson.lesson_time, DURATION_MIN)}
                </span>
                {lesson.topic && <span className="text-[11px] text-muted truncate ml-2">{lesson.topic}</span>}
              </div>
              <textarea
                className="w-full bg-transparent text-sm text-[#dbe2ee] outline-none resize-none border border-transparent hover:border-[#26364f] focus:border-accent rounded-lg p-2 -m-2 transition-colors"
                rows={3}
                placeholder="Nerede kaldık, ne işlendi, ödev vb..."
                defaultValue={lesson.notes}
                onBlur={(e) => {
                  if (e.target.value !== lesson.notes) saveNote(lesson.id, e.target.value);
                }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
