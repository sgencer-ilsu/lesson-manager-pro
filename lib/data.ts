import type { SupabaseClient } from "@supabase/supabase-js";
import type { Student, Planned, Lesson, CalendarEvent } from "./types";
import { addDays, addMinutesToTime, DURATION_MIN, monthRange, timeToMinutes, toISODate } from "./utils";

// ============ STUDENTS ============

export async function getStudents(sb: SupabaseClient): Promise<Student[]> {
  const { data, error } = await sb.from("students").select("*").order("active", { ascending: false }).order("name");
  if (error) throw error;
  return data as Student[];
}

export async function getActiveStudents(sb: SupabaseClient): Promise<Student[]> {
  const { data, error } = await sb.from("students").select("*").eq("active", true).order("name");
  if (error) throw error;
  return data as Student[];
}

export async function addStudent(
  sb: SupabaseClient,
  fields: Omit<Partial<Student>, "id" | "user_id" | "created_at">
) {
  const { count } = await sb.from("students").select("*", { count: "exact", head: true });
  const COLORS = ["#7c3aed", "#2563eb", "#059669", "#ea580c", "#dc2626", "#0891b2", "#a21caf", "#ca8a04"];
  const color = COLORS[(count || 0) % COLORS.length];
  const { error } = await sb.from("students").insert({ ...fields, color, active: fields.active ?? true });
  if (error) throw error;
}

export async function updateStudentField(
  sb: SupabaseClient,
  studentId: number,
  fields: Partial<Pick<Student, "name" | "school" | "subject" | "fee" | "parent_name" | "phone" | "email" | "active">>
) {
  const { error } = await sb.from("students").update(fields).eq("id", studentId);
  if (error) throw error;
}

// ============ AYLIK ÜCRETLER (öncelikli fiyatlandırma) ============

/** Bir öğrencinin belirli bir ay için geçerli ücretini bulur: o aya veya
 *  öncesine ait en yakın kayıtlı özel ücreti kullanır ("önceki aydakiler
 *  aynen devam eder"); hiç özel kayıt yoksa öğrencinin temel ücretine döner. */
export async function getEffectiveFee(sb: SupabaseClient, studentId: number, monthKeyStr: string): Promise<number> {
  const { data, error } = await sb
    .from("student_monthly_fees")
    .select("fee")
    .eq("student_id", studentId)
    .lte("month_key", monthKeyStr)
    .order("month_key", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return data.fee;
  const { data: student } = await sb.from("students").select("fee").eq("id", studentId).maybeSingle();
  return student?.fee || 0;
}

/** Aktif öğrencileri, seçilen ay için geçerli ücretleriyle birlikte döner. */
export async function getStudentsForMonth(
  sb: SupabaseClient,
  monthKeyStr: string
): Promise<(Student & { monthFee: number })[]> {
  const students = await getActiveStudents(sb);
  const { data: feeRows, error } = await sb
    .from("student_monthly_fees")
    .select("student_id, month_key, fee")
    .lte("month_key", monthKeyStr)
    .order("month_key", { ascending: false });
  if (error) throw error;

  const latestByStudent = new Map<number, number>();
  for (const row of feeRows || []) {
    if (!latestByStudent.has(row.student_id)) latestByStudent.set(row.student_id, row.fee);
  }

  return students.map((s) => ({ ...s, monthFee: latestByStudent.get(s.id) ?? s.fee }));
}

/** Bir öğrencinin belirli bir ay için ücretini kaydeder (yoksa oluşturur).
 *  O aydan itibaren, yeni bir ay için ayrıca değiştirilene kadar geçerli olur. */
export async function setMonthlyFee(sb: SupabaseClient, studentId: number, monthKeyStr: string, fee: number) {
  const { error } = await sb
    .from("student_monthly_fees")
    .upsert({ student_id: studentId, month_key: monthKeyStr, fee }, { onConflict: "student_id,month_key" });
  if (error) throw error;
}

// ============ TEMİZLİK (veri tutarlılığı) ============

/** Aynı öğrencinin aynı gün/saatinde birden fazla planned satırı varsa fazlalarını siler.
 *  google_event_id'si olan satır korunur; ikisi de yoksa küçük id'li korunur. */
export async function deduplicatePlanned(sb: SupabaseClient) {
  const { data: rows } = await sb
    .from("planned")
    .select("id, student_id, lesson_date, lesson_time, google_event_id, materialized_lesson_id")
    .order("id", { ascending: true });

  if (!rows || rows.length === 0) return;

  // google_event_id'si gerçek olan önce gelir, sonra küçük id
  const sorted = [...rows].sort((a: any, b: any) => {
    const aOk = a.google_event_id && a.google_event_id !== "syncing" ? 0 : 1;
    const bOk = b.google_event_id && b.google_event_id !== "syncing" ? 0 : 1;
    if (aOk !== bOk) return aOk - bOk;
    return a.id - b.id;
  });

  const seen = new Set<string>();
  const toDelete: any[] = [];

  for (const row of sorted) {
    const key = `${(row as any).student_id}-${row.lesson_date}-${row.lesson_time}`;
    if (!seen.has(key)) {
      seen.add(key);
    } else {
      toDelete.push(row);
    }
  }

  for (const row of toDelete) {
    if ((row as any).materialized_lesson_id) {
      await sb.from("lessons").delete().eq("id", (row as any).materialized_lesson_id);
    }
    await sb.from("planned").delete().eq("id", row.id);
  }
}

// ============ RECURRING / MATERIALIZATION (kron işleri) ============

/** Zamanı geçmiş planlı dersleri 'lessons' tablosuna aktarır (yapıldı olarak işaretler). */
export async function materializeDue(sb: SupabaseClient) {
  const now = new Date();
  const { data: rows, error } = await sb
    .from("planned")
    .select("*, students(fee)")
    .eq("status", "planned")
    .is("materialized_lesson_id", null);
  if (error) throw error;

  for (const r of rows || []) {
    const dt = new Date(`${r.lesson_date}T${r.lesson_time}:00`);
    if (dt <= now) {
      // Bu satırı "ele geçirmeyi" dene: sadece hâlâ 'planned' durumundaysa
      // 'materializing' yap. Başka bir sekme/istemci aynı anda aynı işlemi
      // yapmaya çalışıyorsa, bu güncelleme onda 0 satır etkiler ve o taraf
      // atlar — böylece aynı ders iki kez oluşturulamaz.
      const { data: claimed } = await sb
        .from("planned")
        .update({ status: "materializing" })
        .eq("id", r.id)
        .eq("status", "planned")
        .select("id");
      if (!claimed || claimed.length === 0) continue;

      const fee = r.fee || (r as any).students?.fee || 0;
      const { data: inserted, error: insErr } = await sb
        .from("lessons")
        .insert({
          student_id: r.student_id,
          lesson_date: r.lesson_date,
          lesson_time: r.lesson_time,
          duration_min: DURATION_MIN,
          topic: "",
          fee,
          paid: false,
          notes: r.note || "",
          planned_id: r.id,
        })
        .select()
        .single();
      if (insErr) throw insErr;
      await sb.from("planned").update({ materialized_lesson_id: inserted.id, status: "done" }).eq("id", r.id);
    }
  }
}

/** Tekrarlayan (haftalık) planların ileriki/geçmiş 90 günlük tekil kayıtlarını oluşturur.
 *  Her yeni kayıt, kendi tarihinin ait olduğu ayın geçerli (aylık) ücretini kullanır. */
export async function ensureRecurringInstances(sb: SupabaseClient, untilDays = 90) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = addDays(today, -30);
  const end = addDays(today, untilDays);

  const { data: masters, error } = await sb
    .from("planned")
    .select("*")
    .eq("recurring", true)
    .is("parent_plan_id", null);
  if (error) throw error;

  for (const m of masters || []) {
    const masterDate = new Date(`${m.lesson_date}T00:00:00`);
    const weekday = m.weekday ?? (masterDate.getDay() + 6) % 7;
    const recEnd = m.recurrence_end ? new Date(`${m.recurrence_end}T00:00:00`) : end;
    let d = start > masterDate ? start : masterDate;
    while (((d.getDay() + 6) % 7) !== weekday) d = addDays(d, 1);
    const finalEnd = recEnd < end ? recEnd : end;
    while (d <= finalEnd) {
      const dISO = toISODate(d);
      if (dISO !== m.lesson_date) {
        const { data: exists } = await sb
          .from("planned")
          .select("id")
          .eq("parent_plan_id", m.id)
          .eq("lesson_date", dISO)
          .maybeSingle();
        if (!exists) {
          const instanceFee = await getEffectiveFee(sb, m.student_id, dISO.slice(0, 7));
          // Eş zamanlı çağrılarda aynı satırın iki kez eklenmesini önlemek için
          // çakışma olunca yoksay (onConflict do nothing)
          await sb.from("planned").insert({
            student_id: m.student_id,
            lesson_date: dISO,
            lesson_time: m.lesson_time,
            fee: instanceFee,
            note: m.note,
            recurring: false,
            weekday,
            recurrence_end: m.recurrence_end,
            parent_plan_id: m.id,
            status: "planned",
          }).select().maybeSingle();
        }
      }
      d = addDays(d, 7);
    }
  }
}

// ============ DASHBOARD ============

export async function getDashboardTotals(sb: SupabaseClient, monthText: string) {
  const today = toISODate(new Date());
  const { start, end } = monthRange(monthText);
  const [
    { data: lessonRows, error: e1 },
    { data: futurePlanned, error: e2 },
    { data: paidRows, error: e3 },
    { data: earnedRows, error: e4 },
  ] = await Promise.all([
    // Tüm gerçekleşmiş dersler (lessons tablosu)
    sb.from("lessons").select("fee").gte("lesson_date", start).lt("lesson_date", end),
    // Henüz yapılmamış planlı dersler (planned tablosu, status=planned, materialized yok)
    sb.from("planned").select("fee").gte("lesson_date", start).lt("lesson_date", end).eq("status", "planned").is("materialized_lesson_id", null),
    // Ödenen dersler
    sb.from("lessons").select("fee").gte("lesson_date", start).lt("lesson_date", end).eq("paid", true),
    // Bugüne kadar yapılan dersler
    sb.from("lessons").select("fee").gte("lesson_date", start).lt("lesson_date", end).lte("lesson_date", today),
  ]);
  if (e1 || e2 || e3 || e4) throw e1 || e2 || e3 || e4;
  const sum = (rows: { fee: number }[] | null) => (rows || []).reduce((a, r) => a + (r.fee || 0), 0);
  return {
    planned: sum(lessonRows as any) + sum(futurePlanned as any),
    earned: sum(earnedRows as any),
    paid: sum(paidRows as any),
    count: (lessonRows?.length || 0) + (futurePlanned?.length || 0),
  };
}

export type TodayRow = {
  kind: "done" | "planned";
  lesson_date: string;
  lesson_time: string;
  topic: string;
  fee: number;
  name: string;
  subject: string;
  color: string;
};

export async function getTodayPanel(sb: SupabaseClient): Promise<TodayRow[]> {
  const today = toISODate(new Date());
  const [{ data: done, error: e1 }, { data: planned, error: e2 }] = await Promise.all([
    sb.from("lessons").select("lesson_date,lesson_time,topic,fee,students(name,subject,color)").eq("lesson_date", today),
    sb
      .from("planned")
      .select("lesson_date,lesson_time,note,fee,students(name,subject,color)")
      .eq("lesson_date", today)
      .eq("status", "planned")
      .is("materialized_lesson_id", null),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const rows: TodayRow[] = [];
  for (const r of done || []) {
    const s: any = (r as any).students;
    rows.push({ kind: "done", lesson_date: r.lesson_date, lesson_time: r.lesson_time, topic: r.topic || "", fee: r.fee, name: s?.name || "", subject: s?.subject || "", color: s?.color || "#2563eb" });
  }
  for (const r of planned || []) {
    const s: any = (r as any).students;
    rows.push({ kind: "planned", lesson_date: r.lesson_date, lesson_time: r.lesson_time, topic: (r as any).note || "", fee: r.fee, name: s?.name || "", subject: s?.subject || "", color: s?.color || "#2563eb" });
  }
  rows.sort((a, b) => a.lesson_time.localeCompare(b.lesson_time));
  return rows;
}

// ============ CALENDAR (haftalık görünüm) ============

export async function getWeekEvents(sb: SupabaseClient, weekStartISO: string, weekEndISO: string): Promise<CalendarEvent[]> {
  const [{ data: plannedRows, error: e1 }, { data: lessonRows, error: e2 }] = await Promise.all([
    sb
      .from("planned")
      .select("*, students(name,subject,color,school), lessons!planned_materialized_lesson_fk(topic)")
      .gte("lesson_date", weekStartISO)
      .lte("lesson_date", weekEndISO),
    sb
      .from("lessons")
      .select("*, students(name,subject,color,school)")
      .gte("lesson_date", weekStartISO)
      .lte("lesson_date", weekEndISO)
      .is("planned_id", null),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const events: CalendarEvent[] = [];
  for (const p of plannedRows || []) {
    const s: any = (p as any).students;
    const materializedTopic = (p as any).lessons?.topic;
    events.push({
      row_type: "planned",
      row_id: p.id,
      plan_id: p.id,
      lesson_id: p.materialized_lesson_id,
      student_id: p.student_id,
      lesson_date: p.lesson_date,
      lesson_time: p.lesson_time,
      fee: p.fee,
      topic: materializedTopic || p.note || "",
      status: p.status,
      recurring: p.recurring,
      parent_plan_id: p.parent_plan_id,
      student_name: s?.name || "",
      subject: s?.subject || "",
      school: s?.school || "",
      color: s?.color || "#7c3aed",
    });
  }
  for (const l of lessonRows || []) {
    const s: any = (l as any).students;
    events.push({
      row_type: "lesson",
      row_id: l.id,
      plan_id: null,
      lesson_id: l.id,
      student_id: l.student_id,
      lesson_date: l.lesson_date,
      lesson_time: l.lesson_time,
      fee: l.fee,
      topic: l.topic || "",
      status: "done",
      recurring: false,
      parent_plan_id: null,
      student_name: s?.name || "",
      subject: s?.subject || "",
      school: s?.school || "",
      color: s?.color || "#7c3aed",
    });
  }
  events.sort((a, b) => (a.lesson_date + a.lesson_time).localeCompare(b.lesson_date + b.lesson_time));

  // Aynı öğrencinin aynı gün/saatte iki kez görünmesini engelle
  // (planned + materialized lesson çakışması durumuna karşı)
  const seen = new Set<string>();
  const deduped: CalendarEvent[] = [];
  for (const ev of events) {
    const key = `${ev.student_id}-${ev.lesson_date}-${ev.lesson_time}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(ev);
    }
  }
  return deduped;
}

/** Takvimden / dialogdan yeni ders planlama. Geçmiş bir zaman seçilirse direkt yapılan ders olarak kaydedilir. */
export async function planLesson(
  sb: SupabaseClient,
  params: {
    studentId: number;
    date: string;
    time: string;
    fee: number;
    note: string;
    recurring: boolean;
    recurrenceEnd: string | null;
  }
) {
  const selectedDt = new Date(`${params.date}T${params.time}:00`);
  const weekday = (new Date(`${params.date}T00:00:00`).getDay() + 6) % 7;

  if (selectedDt <= new Date() && !params.recurring) {
    const { data: lesson, error: e1 } = await sb
      .from("lessons")
      .insert({
        student_id: params.studentId,
        lesson_date: params.date,
        lesson_time: params.time,
        duration_min: DURATION_MIN,
        topic: params.note,
        fee: params.fee,
        paid: false,
        notes: "",
      })
      .select()
      .single();
    if (e1) throw e1;

    const { data: plan, error: e2 } = await sb
      .from("planned")
      .insert({
        student_id: params.studentId,
        lesson_date: params.date,
        lesson_time: params.time,
        fee: params.fee,
        note: params.note,
        recurring: false,
        weekday,
        recurrence_end: null,
        materialized_lesson_id: lesson.id,
        status: "done",
      })
      .select()
      .single();
    if (e2) throw e2;

    await sb.from("lessons").update({ planned_id: plan.id }).eq("id", lesson.id);
  } else {
    const { error } = await sb.from("planned").insert({
      student_id: params.studentId,
      lesson_date: params.date,
      lesson_time: params.time,
      fee: params.fee,
      note: params.note,
      recurring: params.recurring,
      weekday,
      recurrence_end: params.recurring ? params.recurrenceEnd : null,
      status: "planned",
    });
    if (error) throw error;
  }
}

export type RecurringScope = "one" | "series";

export async function saveEvent(
  sb: SupabaseClient,
  ev: CalendarEvent,
  updated: { studentId: number; date: string; time: string; fee: number; topic: string },
  scope: RecurringScope
) {
  if (ev.lesson_id) {
    await sb
      .from("lessons")
      .update({ student_id: updated.studentId, lesson_date: updated.date, lesson_time: updated.time, topic: updated.topic, fee: updated.fee })
      .eq("id", ev.lesson_id);
  }
  if (ev.plan_id) {
    await sb
      .from("planned")
      .update({ student_id: updated.studentId, lesson_date: updated.date, lesson_time: updated.time, fee: updated.fee, note: updated.topic })
      .eq("id", ev.plan_id);
  }
  if (scope === "series") {
    const masterId = ev.parent_plan_id || ev.plan_id;
    if (masterId) {
      await sb
        .from("planned")
        .update({ student_id: updated.studentId, lesson_time: updated.time, fee: updated.fee, note: updated.topic })
        .or(`id.eq.${masterId},parent_plan_id.eq.${masterId}`);
    }
  }
}

export async function deleteEvent(sb: SupabaseClient, ev: CalendarEvent, scope: RecurringScope) {
  if (scope === "series") {
    const masterId = ev.parent_plan_id || ev.plan_id;
    if (masterId) {
      const { data: linked } = await sb
        .from("planned")
        .select("materialized_lesson_id")
        .or(`id.eq.${masterId},parent_plan_id.eq.${masterId}`);
      for (const r of linked || []) {
        if (r.materialized_lesson_id) await sb.from("lessons").delete().eq("id", r.materialized_lesson_id);
      }
      await sb.from("planned").delete().or(`id.eq.${masterId},parent_plan_id.eq.${masterId}`);
    }
  } else {
    if (ev.lesson_id) await sb.from("lessons").delete().eq("id", ev.lesson_id);
    if (ev.plan_id) await sb.from("planned").delete().eq("id", ev.plan_id);
  }
}

export async function moveCalendarItem(sb: SupabaseClient, ev: CalendarEvent, newDate: string, newTime: string, scope: RecurringScope) {
  const weekday = (new Date(`${newDate}T00:00:00`).getDay() + 6) % 7;
  const isFuture = new Date(`${newDate}T${newTime}:00`) > new Date();

  if (ev.lesson_id && isFuture) {
    // Geçmişte yapılmış ders → gelecekteki bir tarihe taşındı:
    // lessons kaydını sil, plan'ı "planned" durumuna döndür
    await sb.from("lessons").delete().eq("id", ev.lesson_id);
    if (ev.plan_id) {
      await sb.from("planned")
        .update({ lesson_date: newDate, lesson_time: newTime, weekday, status: "planned", materialized_lesson_id: null })
        .eq("id", ev.plan_id);
    }
  } else {
    if (ev.lesson_id) {
      await sb.from("lessons").update({ lesson_date: newDate, lesson_time: newTime }).eq("id", ev.lesson_id);
    }
    if (ev.plan_id) {
      await sb.from("planned").update({ lesson_date: newDate, lesson_time: newTime, weekday }).eq("id", ev.plan_id);
    }
  }

  if (scope === "series") {
    const masterId = ev.parent_plan_id || ev.plan_id;
    if (masterId) {
      await sb.from("planned").update({ lesson_time: newTime }).or(`id.eq.${masterId},parent_plan_id.eq.${masterId}`);
    }
  }
}

// ============ DERSLER / RAPORLAR listesi ============

export type LessonRow = {
  row_type: "lesson" | "planned";
  row_id: number;
  lesson_date: string;
  lesson_time: string;
  topic: string;
  fee: number;
  paid: boolean;
  name: string;
  school: string;
  subject: string;
};

export async function getLessonRows(
  sb: SupabaseClient,
  monthText: string,
  studentId: number | null,
  paidFilter: "Tümü" | "Ödendi" | "Ödenmedi" | "Planlandı"
): Promise<LessonRow[]> {
  const rows: LessonRow[] = [];
  const { start, end } = monthRange(monthText);

  if (paidFilter !== "Planlandı") {
    let q = sb
      .from("lessons")
      .select("id,lesson_date,lesson_time,topic,fee,paid,students(name,school,subject)")
      .gte("lesson_date", start)
      .lt("lesson_date", end);
    if (studentId) q = q.eq("student_id", studentId);
    if (paidFilter === "Ödendi") q = q.eq("paid", true);
    if (paidFilter === "Ödenmedi") q = q.eq("paid", false);
    const { data, error } = await q;
    if (error) throw error;
    for (const r of data || []) {
      const s: any = (r as any).students;
      rows.push({ row_type: "lesson", row_id: r.id, lesson_date: r.lesson_date, lesson_time: r.lesson_time, topic: r.topic || "", fee: r.fee, paid: r.paid, name: s?.name || "", school: s?.school || "", subject: s?.subject || "" });
    }
  }

  if (paidFilter === "Tümü" || paidFilter === "Planlandı") {
    let q = sb
      .from("planned")
      .select("id,lesson_date,lesson_time,fee,note,students(name,school,subject)")
      .gte("lesson_date", start)
      .lt("lesson_date", end)
      .is("materialized_lesson_id", null)
      .eq("status", "planned");
    if (studentId) q = q.eq("student_id", studentId);
    const { data, error } = await q;
    if (error) throw error;
    for (const r of data || []) {
      const s: any = (r as any).students;
      rows.push({ row_type: "planned", row_id: r.id, lesson_date: r.lesson_date, lesson_time: r.lesson_time, topic: (r as any).note || "", fee: r.fee, paid: false, name: s?.name || "", school: s?.school || "", subject: s?.subject || "" });
    }
  }

  rows.sort((a, b) => (a.lesson_date + a.lesson_time + a.row_type).localeCompare(b.lesson_date + b.lesson_time + b.row_type));
  return rows;
}

export async function updateLessonTopic(sb: SupabaseClient, lessonId: number, topic: string) {
  await sb.from("lessons").update({ topic }).eq("id", lessonId);
}

/** Henüz gerçekleşmemiş (planlı) bir dersin konu/not alanını günceller,
 *  böylece ay bitmeden veliye gönderilecek raporda görünebilir. */
export async function updatePlannedTopic(sb: SupabaseClient, plannedId: number, note: string) {
  await sb.from("planned").update({ note }).eq("id", plannedId);
}

export async function updateLessonPaid(sb: SupabaseClient, lessonId: number, paid: boolean) {
  await sb.from("lessons").update({ paid }).eq("id", lessonId);
}

export async function quickAddLesson(
  sb: SupabaseClient,
  params: { studentId: number; date: string; time: string; topic: string; fee: number; paid: boolean }
) {
  const { error } = await sb.from("lessons").insert({
    student_id: params.studentId,
    lesson_date: params.date,
    lesson_time: params.time,
    duration_min: DURATION_MIN,
    topic: params.topic,
    fee: params.fee,
    paid: params.paid,
    notes: "",
  });
  if (error) throw error;
}

// ============ AYLIK KAZANÇ GEÇMİŞİ ============

export type MonthlyEarning = { monthKey: string; total: number };

/** İlk plandan (uygulamanın gerçekten kullanılmaya başladığı aydan) bugüne
 *  kadar her ayın TAHMİNİ toplam gelirini (o ay için planlanan tüm derslerin
 *  toplam ücreti, yapılmış/yapılmamış fark etmeksizin) döner. Veri olmayan
 *  geçmiş aylar hiç gösterilmez; yeni aylar geldikçe liste otomatik uzar. */
export async function getMonthlyEarnings(sb: SupabaseClient): Promise<MonthlyEarning[]> {
  const { data: firstRow } = await sb
    .from("planned")
    .select("lesson_date")
    .order("lesson_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  const today = new Date();
  let startYear = today.getFullYear();
  let startMonth = today.getMonth();
  if (firstRow?.lesson_date) {
    const d = new Date(`${firstRow.lesson_date}T00:00:00`);
    startYear = d.getFullYear();
    startMonth = d.getMonth();
  }

  const start = new Date(startYear, startMonth, 1);
  const startISO = toISODate(start);

  const { data, error } = await sb.from("planned").select("lesson_date, fee").gte("lesson_date", startISO);
  if (error) throw error;

  const totals = new Map<string, number>();
  const cursor = new Date(startYear, startMonth, 1);
  const end = new Date(today.getFullYear(), today.getMonth(), 1);
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    totals.set(key, 0);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  for (const row of data || []) {
    const key = row.lesson_date.slice(0, 7);
    if (totals.has(key)) totals.set(key, (totals.get(key) || 0) + (row.fee || 0));
  }

  return Array.from(totals.entries()).map(([monthKey, total]) => ({ monthKey, total }));
}

// ============ ÖĞRENCİ DERS NOTLARI ============

export type StudentLessonNote = {
  id: number;
  lesson_date: string;
  lesson_time: string;
  topic: string;
  notes: string;
};

/** Bir öğrencinin geçmişte yapılmış derslerini (en eskiden en yeniye) döner. */
export async function getStudentLessonHistory(sb: SupabaseClient, studentId: number): Promise<StudentLessonNote[]> {
  const { data, error } = await sb
    .from("lessons")
    .select("id, lesson_date, lesson_time, topic, notes")
    .eq("student_id", studentId)
    .order("lesson_date", { ascending: true })
    .order("lesson_time", { ascending: true });
  if (error) throw error;
  return (data || []) as StudentLessonNote[];
}

export async function updateLessonNotes(sb: SupabaseClient, lessonId: number, notes: string) {
  const { error } = await sb.from("lessons").update({ notes }).eq("id", lessonId);
  if (error) throw error;
}
