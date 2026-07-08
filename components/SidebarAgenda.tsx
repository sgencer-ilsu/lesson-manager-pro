"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getWeekEvents } from "@/lib/data";
import type { CalendarEvent } from "@/lib/types";
import { addDays, addMinutesToTime, DURATION_MIN, timeToMinutes, toISODate, TR_DAYS_SHORT, TR_MONTHS_SHORT } from "@/lib/utils";
import { onLessonsChanged } from "@/lib/events";

type DayGroup = {
  dateISO: string;
  day: number;
  weekday: string;
  month: string;
  isToday: boolean;
  events: CalendarEvent[];
};

export default function SidebarAgenda() {
  const sb = useMemo(() => createClient(), []);
  const [groups, setGroups] = useState<DayGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const todayRef = useRef<HTMLDivElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const scrolledRef = useRef(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const load = useMemo(() => {
    return async () => {
      const today = new Date();
      const start = addDays(today, -30);
      const end = addDays(today, 60);
      const events = await getWeekEvents(sb, toISODate(start), toISODate(end));

      const byDate = new Map<string, CalendarEvent[]>();
      for (const ev of events) {
        if (!byDate.has(ev.lesson_date)) byDate.set(ev.lesson_date, []);
        byDate.get(ev.lesson_date)!.push(ev);
      }

      const todayISO = toISODate(today);
      const dates = Array.from(byDate.keys()).sort();
      const built: DayGroup[] = dates.map((dateISO) => {
        const d = new Date(`${dateISO}T00:00:00`);
        const evs = byDate.get(dateISO)!.sort((a, b) => a.lesson_time.localeCompare(b.lesson_time));
        return {
          dateISO,
          day: d.getDate(),
          weekday: TR_DAYS_SHORT[(d.getDay() + 6) % 7],
          month: TR_MONTHS_SHORT[d.getMonth()],
          isToday: dateISO === todayISO,
          events: evs,
        };
      });

      setGroups(built);
      setLoading(false);
    };
  }, [sb]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsubscribe = onLessonsChanged(() => load());
    return unsubscribe;
  }, [load]);

  useEffect(() => {
    if (!scrolledRef.current && groups.length > 0 && todayRef.current && scrollAreaRef.current) {
      todayRef.current.scrollIntoView({ block: "start" });
      scrolledRef.current = true;
    }
  }, [groups]);

  return (
    <div className="flex-1 min-h-0 flex flex-col mt-4 border-t border-[#1a2338] pt-3">
      <div className="text-[11px] font-semibold text-muted tracking-wide px-2 mb-1">DERS AKIŞI</div>
      <div ref={scrollAreaRef} className="flex-1 min-h-0 overflow-y-auto px-1">
        {loading ? (
          <p className="text-xs text-muted px-2 py-3">Yükleniyor…</p>
        ) : groups.length === 0 ? (
          <p className="text-xs text-muted px-2 py-3">Görünen ders yok.</p>
        ) : (
          groups.map((g) => {
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            const pastEvents = g.isToday ? g.events.filter((ev) => timeToMinutes(ev.lesson_time) + DURATION_MIN <= nowMinutes) : [];
            const upcomingEvents = g.isToday ? g.events.filter((ev) => timeToMinutes(ev.lesson_time) + DURATION_MIN > nowMinutes) : g.events;

            return (
              <div key={g.dateISO} ref={g.isToday ? todayRef : undefined}>
                <div className="flex gap-2.5 px-2 py-2.5">
                  <div className="shrink-0 w-10 flex flex-col items-center text-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold ${
                        g.isToday ? "bg-accent text-white" : "text-[#8b98b3]"
                      }`}
                    >
                      {g.day}
                    </div>
                    <div className="text-[9px] text-muted font-semibold tracking-wide mt-1 leading-tight whitespace-nowrap">{g.month}</div>
                    <div className="text-[9px] text-muted/70 leading-tight whitespace-nowrap">{g.weekday}</div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5 pt-0.5">
                    {pastEvents.map((ev, i) => (
                      <EventRow key={`past-${i}`} ev={ev} dim />
                    ))}
                    {upcomingEvents.map((ev, i) => (
                      <EventRow key={`up-${i}`} ev={ev} />
                    ))}
                  </div>
                </div>
                <div className="border-b border-[#161f34]" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function EventRow({ ev, dim = false }: { ev: CalendarEvent; dim?: boolean }) {
  return (
    <div className={`flex items-start gap-1.5 text-[12px] ${dim ? "opacity-45" : ""}`}>
      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: ev.color }} />
      <div className="min-w-0">
        <div className="text-[#8b98b3]">
          {ev.lesson_time} – {addMinutesToTime(ev.lesson_time, DURATION_MIN)}
        </div>
        <div className="text-[#dbe2ee] font-medium truncate">{ev.student_name}</div>
      </div>
    </div>
  );
}
