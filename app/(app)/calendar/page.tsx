"use client";

import { useState } from "react";
import WeekCalendar from "@/components/WeekCalendar";
import LessonFormDialog from "@/components/LessonFormDialog";
import { createClient } from "@/lib/supabase/client";
import { planLesson } from "@/lib/data";
import { addDays, mondayOf, TR_MONTHS } from "@/lib/utils";

export default function CalendarPage() {
  const sb = createClient();
  const [weekStart, setWeekStart] = useState(mondayOf(new Date()));
  const [showNew, setShowNew] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const weekEnd = addDays(weekStart, 6);
  const title = `${weekStart.getDate()} ${TR_MONTHS[weekStart.getMonth()]} – ${weekEnd.getDate()} ${TR_MONTHS[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;

  async function handleNewSave(fields: any) {
    await planLesson(sb, fields);
    setShowNew(false);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="max-w-[1200px]">
      <h1 className="text-2xl font-bold text-white mb-4">Takvim</h1>
      <div className="flex items-center gap-2 mb-4">
        <button className="btn" onClick={() => setWeekStart(addDays(weekStart, -7))}>
          ‹ Önceki Hafta
        </button>
        <button className="btn" onClick={() => setWeekStart(mondayOf(new Date()))}>
          Bugün
        </button>
        <button className="btn" onClick={() => setWeekStart(addDays(weekStart, 7))}>
          Sonraki Hafta ›
        </button>
        <div className="flex-1 text-center text-sm font-semibold text-white">{title}</div>
        <button className="btn-primary" onClick={() => setShowNew(true)}>
          + Yeni Ders
        </button>
      </div>

      <div className="card p-4">
        <WeekCalendar key={refreshKey} weekStart={weekStart} onChanged={() => {}} />
      </div>

      {showNew && (
        <LessonFormDialog target={{ mode: "new", date: new Date(), time: null }} onClose={() => setShowNew(false)} onSave={handleNewSave} />
      )}
    </div>
  );
}
