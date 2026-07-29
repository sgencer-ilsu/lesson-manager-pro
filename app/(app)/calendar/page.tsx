"use client";

import { useEffect, useState } from "react";
import WeekCalendar from "@/components/WeekCalendar";
import LessonFormDialog from "@/components/LessonFormDialog";
import { createClient } from "@/lib/supabase/client";
import { planLesson } from "@/lib/data";
import { addDays, mondayOf, TR_MONTHS } from "@/lib/utils";

function formatTitle(start: Date, days: number) {
  const end = addDays(start, days - 1);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${TR_MONTHS[start.getMonth()]} ${end.getFullYear()}`;
  }
  return `${start.getDate()} ${TR_MONTHS[start.getMonth()]} – ${end.getDate()} ${TR_MONTHS[end.getMonth()]} ${end.getFullYear()}`;
}

export default function CalendarPage() {
  const sb = createClient();
  const [isMobile, setIsMobile] = useState(false);
  const [viewStart, setViewStart] = useState(mondayOf(new Date()));
  const [showNew, setShowNew] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Mobilde bugünden başla, masaüstünde haftanın Pazartesi'sinden
  useEffect(() => {
    if (isMobile) {
      setViewStart(new Date(new Date().setHours(0, 0, 0, 0)));
    } else {
      setViewStart(mondayOf(new Date()));
    }
  }, [isMobile]);

  const visibleDays = isMobile ? 3 : 7;
  const step = visibleDays;

  async function handleNewSave(fields: any) {
    await planLesson(sb, fields);
    setShowNew(false);
    setRefreshKey((k) => k + 1);
  }

  function goToday() {
    if (isMobile) {
      setViewStart(new Date(new Date().setHours(0, 0, 0, 0)));
    } else {
      setViewStart(mondayOf(new Date()));
    }
  }

  return (
    <div className="max-w-[1200px]">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold text-white md:text-2xl">Takvim</h1>
        <button className="btn-primary text-sm px-4 py-2" onClick={() => setShowNew(true)}>
          + Yeni Ders
        </button>
      </div>

      {/* Navigasyon */}
      <div className="flex items-center gap-2 mb-3">
        <button
          className="btn px-3 py-2 text-sm"
          onClick={() => setViewStart(addDays(viewStart, -step))}
        >
          ‹
        </button>
        <button className="btn px-3 py-2 text-sm" onClick={goToday}>
          Bugün
        </button>
        <button
          className="btn px-3 py-2 text-sm"
          onClick={() => setViewStart(addDays(viewStart, step))}
        >
          ›
        </button>
        <span className="flex-1 text-center text-sm font-semibold text-white">
          {formatTitle(viewStart, visibleDays)}
        </span>
      </div>

      <div className="card p-4">
        <WeekCalendar
          key={`${refreshKey}-${visibleDays}`}
          weekStart={viewStart}
          visibleDays={visibleDays}
          onChanged={() => {}}
        />
      </div>

      {showNew && (
        <LessonFormDialog
          target={{ mode: "new", date: new Date(), time: null }}
          onClose={() => setShowNew(false)}
          onSave={handleNewSave}
        />
      )}
    </div>
  );
}
