"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CalendarEvent } from "@/lib/types";
import { getWeekEvents, planLesson, saveEvent, deleteEvent, moveCalendarItem, type RecurringScope } from "@/lib/data";
import { addDays, addMinutesToTime, DURATION_MIN, timeToMinutes, minutesToTime, toISODate } from "@/lib/utils";
import { emitLessonsChanged } from "@/lib/events";
import LessonFormDialog from "./LessonFormDialog";
import RecurringScopeDialog from "./RecurringScopeDialog";

const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

type DialogState =
  | { kind: "none" }
  | { kind: "new"; date: Date; time: string | null }
  | { kind: "edit"; event: CalendarEvent };

type PendingAction =
  | { type: "save"; event: CalendarEvent; fields: any }
  | { type: "delete"; event: CalendarEvent }
  | { type: "move"; event: CalendarEvent; date: string; time: string };

export default function WeekCalendar({
  weekStart,
  compact = false,
  onChanged,
}: {
  weekStart: Date;
  compact?: boolean;
  onChanged?: () => void;
}) {
  const sb = useMemo(() => createClient(), []);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const [pending, setPending] = useState<PendingAction | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragEventRef = useRef<CalendarEvent | null>(null);

  const hourPx = compact ? 40 : 60;
  const headerPx = 34;
  const leftPx = 50;

  const load = useCallback(async () => {
    const end = addDays(weekStart, 6);
    const rows = await getWeekEvents(sb, toISODate(weekStart), toISODate(end));
    setEvents(rows);
  }, [sb, weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * hourPx;
    }
  }, [weekStart, hourPx]);

  function refresh() {
    load();
    onChanged?.();
    emitLessonsChanged();
  }

  async function handleNewSave(fields: any) {
    await planLesson(sb, fields);
    setDialog({ kind: "none" });
    refresh();
  }

  function requestSave(event: CalendarEvent, fields: any) {
    if (event.recurring || event.parent_plan_id) {
      setPending({ type: "save", event, fields });
    } else {
      doSave(event, fields, "one");
    }
  }

  async function doSave(event: CalendarEvent, fields: any, scope: RecurringScope) {
    await saveEvent(sb, event, { studentId: fields.studentId, date: fields.date, time: fields.time, fee: fields.fee, topic: fields.note }, scope);
    setDialog({ kind: "none" });
    setPending(null);
    refresh();
  }

  function requestDelete(event: CalendarEvent) {
    if (event.recurring || event.parent_plan_id) {
      setPending({ type: "delete", event });
    } else {
      doDelete(event, "one");
    }
  }

  async function doDelete(event: CalendarEvent, scope: RecurringScope) {
    await deleteEvent(sb, event, scope);
    setDialog({ kind: "none" });
    setPending(null);
    refresh();
  }

  async function doMove(event: CalendarEvent, date: string, time: string, scope: RecurringScope) {
    await moveCalendarItem(sb, event, date, time, scope);
    setPending(null);
    refresh();
  }

  function handleScopeChoice(scope: "one" | "series" | null) {
    if (!pending) return;
    if (scope === null) {
      setPending(null);
      return;
    }
    if (pending.type === "save") doSave(pending.event, pending.fields, scope);
    if (pending.type === "delete") doDelete(pending.event, scope);
    if (pending.type === "move") doMove(pending.event, pending.date, pending.time, scope);
  }

  function requestMove(event: CalendarEvent, date: string, time: string) {
    if (event.recurring || event.parent_plan_id) {
      setPending({ type: "move", event, date, time });
    } else {
      doMove(event, date, time, "one");
    }
  }

  function onDayDrop(dayIndex: number, e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const ev = dragEventRef.current;
    dragEventRef.current = null;
    if (!ev) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    let minutes = Math.round((y / hourPx) * 60);
    minutes = Math.max(0, Math.min(23 * 60 + 45, Math.round(minutes / 15) * 15));
    const day = addDays(weekStart, dayIndex);
    requestMove(ev, toISODate(day), minutesToTime(minutes));
  }

  const today = toISODate(new Date());
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekISOs = weekDates.map(toISODate);
  const showNowLine = weekISOs.includes(today);

  return (
    <div>
      <div className="flex" style={{ marginLeft: leftPx }}>
        {weekDates.map((d, i) => {
          const iso = toISODate(d);
          const isToday = iso === today;
          return (
            <div
              key={i}
              className="flex-1 text-center text-xs font-bold py-2 rounded-t-md"
              style={{ background: isToday ? "#1d4ed8" : "#172033", color: "#e5e7eb", height: headerPx }}
            >
              {DAY_NAMES[i]} {d.getDate()}
            </div>
          );
        })}
      </div>

      <div
        ref={scrollRef}
        className="overflow-y-auto rounded-b-md border border-[#26364f]"
        style={{ maxHeight: compact ? "calc(100vh - 430px)" : "calc(100vh - 260px)", minHeight: 320, background: "#0f172a" }}
      >
        <div className="flex relative" style={{ height: 24 * hourPx }}>
          {/* saat etiketleri */}
          <div style={{ width: leftPx }} className="relative shrink-0">
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                className="absolute right-2 text-[10px] text-[#94a3b8]"
                style={{ top: h * hourPx + 2 }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {weekDates.map((d, dayIndex) => {
            const iso = toISODate(d);
            const dayEvents = events.filter((e) => e.lesson_date === iso);
            const isToday = iso === today;
            return (
              <div
                key={dayIndex}
                className="flex-1 relative border-l border-[#26364f]"
                style={{ background: isToday ? "rgba(37,99,235,0.09)" : "transparent" }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDayDrop(dayIndex, e)}
                onDoubleClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  let minutes = Math.round((y / hourPx) * 60);
                  minutes = Math.max(0, Math.min(23 * 60 + 45, Math.round(minutes / 15) * 15));
                  setDialog({ kind: "new", date: d, time: minutesToTime(minutes) });
                }}
              >
                {/* saat çizgileri */}
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="absolute left-0 right-0 border-t border-[#1c2740]" style={{ top: h * hourPx }} />
                ))}

                {dayEvents.map((ev) => {
                  const startMin = timeToMinutes(ev.lesson_time);
                  const top = (startMin / 60) * hourPx;
                  const height = Math.max(24, (DURATION_MIN / 60) * hourPx - 4);
                  const endText = addMinutesToTime(ev.lesson_time, DURATION_MIN);
                  const subjLine = ev.topic ? `${ev.subject} — ${ev.topic}` : ev.subject;
                  return (
                    <div
                      key={`${ev.row_type}-${ev.row_id}`}
                      draggable
                      onDragStart={() => {
                        dragEventRef.current = ev;
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDialog({ kind: "edit", event: ev });
                      }}
                      className="absolute left-1 right-1 rounded-lg px-2 py-1 cursor-pointer overflow-hidden text-white"
                      style={{
                        top,
                        height,
                        background: ev.color,
                        opacity: ev.status === "done" ? 0.95 : 0.85,
                        borderLeft: "3px solid #c4b5fd",
                      }}
                      title={`${ev.student_name} • ${ev.lesson_time}–${endText}`}
                    >
                      <div className="text-[11px] font-bold truncate">{ev.student_name}</div>
                      <div className="text-[10px] opacity-90 truncate">
                        {ev.lesson_time} – {endText}
                      </div>
                      {!compact && <div className="text-[10px] opacity-90 truncate">{subjLine}</div>}
                    </div>
                  );
                })}

                {isToday && showNowLine && (
                  <div className="absolute left-0 right-0 flex items-center pointer-events-none" style={{ top: (nowMinutes / 60) * hourPx }}>
                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                    <div className="h-[2px] bg-red-500 flex-1" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {dialog.kind === "new" && (
        <LessonFormDialog target={{ mode: "new", date: dialog.date, time: dialog.time }} onClose={() => setDialog({ kind: "none" })} onSave={handleNewSave} />
      )}
      {dialog.kind === "edit" && (
        <LessonFormDialog
          target={{ mode: "edit", event: dialog.event }}
          onClose={() => setDialog({ kind: "none" })}
          onSave={(fields) => requestSave(dialog.event, fields)}
          onDelete={() => requestDelete(dialog.event)}
        />
      )}
      {pending && (
        <RecurringScopeDialog
          actionText={pending.type === "save" ? "düzenlensin" : pending.type === "delete" ? "silinsin" : "taşınsın"}
          onChoice={handleScopeChoice}
        />
      )}
    </div>
  );
}
