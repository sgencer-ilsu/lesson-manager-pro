import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { getOAuth2Client } from "@/lib/google";

const DURATION_MIN = 90;
const APP_TAG = "ders-takip";

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(mins: number) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ connected: false });

  const { data: tokenRow } = await supabase
    .from("google_tokens")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!tokenRow) return NextResponse.json({ connected: false });

  const oauth2Client = getOAuth2Client(origin);
  oauth2Client.setCredentials({ refresh_token: tokenRow.refresh_token });
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 14);
  const end = new Date(today);
  end.setDate(end.getDate() + 120);
  const startISO = start.toISOString().slice(0, 10);
  const endISO = end.toISOString().slice(0, 10);

  const { data: plannedRows, error } = await supabase
    .from("planned")
    .select("id, lesson_date, lesson_time, note, google_event_id, students(name, subject)")
    .gte("lesson_date", startISO)
    .lte("lesson_date", endISO);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const currentIds = new Set((plannedRows || []).map((r: any) => String(r.id)));

  // Google'da bizim etiketimizle oluşturulmuş ama DB'de artık karşılığı olmayan
  // (silinmiş) etkinlikleri bulup temizle.
  try {
    let pageToken: string | undefined = undefined;
    const staleEventIds: string[] = [];
    do {
      const list: any = await calendar.events.list({
        calendarId: "primary",
        privateExtendedProperty: [`appSource=${APP_TAG}`],
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        maxResults: 250,
        pageToken,
        singleEvents: true,
      });
      for (const item of list.data.items || []) {
        const plannedId = item.extendedProperties?.private?.plannedId;
        if (plannedId && !currentIds.has(plannedId) && item.id) {
          staleEventIds.push(item.id);
        }
      }
      pageToken = list.data.nextPageToken || undefined;
    } while (pageToken);

    for (const eventId of staleEventIds) {
      try {
        await calendar.events.delete({ calendarId: "primary", eventId });
      } catch {}
    }
  } catch {
    // Liste alma başarısız olsa bile aşağıdaki oluşturma/güncelleme adımına devam ederiz.
  }

  let synced = 0;
  for (const row of plannedRows || []) {
    const student: any = (row as any).students;
    const studentName = student?.name || "Öğrenci";
    const subject = student?.subject || "";
    const endTime = minutesToTime(timeToMinutes(row.lesson_time) + DURATION_MIN);

    const eventBody = {
      summary: subject ? `${studentName} — ${subject}` : studentName,
      description: row.note || "",
      start: { dateTime: `${row.lesson_date}T${row.lesson_time}:00`, timeZone: "Europe/Istanbul" },
      end: { dateTime: `${row.lesson_date}T${endTime}:00`, timeZone: "Europe/Istanbul" },
      extendedProperties: { private: { appSource: APP_TAG, plannedId: String(row.id) } },
    };

    try {
      if (row.google_event_id) {
        await calendar.events.patch({ calendarId: "primary", eventId: row.google_event_id, requestBody: eventBody });
      } else {
        const created = await calendar.events.insert({ calendarId: "primary", requestBody: eventBody });
        if (created.data.id) {
          await supabase.from("planned").update({ google_event_id: created.data.id }).eq("id", row.id);
        }
      }
      synced++;
    } catch {
      // Google'da etkinlik elle silinmişse (404) veya başka bir hata olursa yeniden oluşturmayı dene.
      try {
        const created = await calendar.events.insert({ calendarId: "primary", requestBody: eventBody });
        if (created.data.id) {
          await supabase.from("planned").update({ google_event_id: created.data.id }).eq("id", row.id);
          synced++;
        }
      } catch {}
    }
  }

  return NextResponse.json({ connected: true, synced });
}

