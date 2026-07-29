import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { getOAuth2Client } from "@/lib/google";

export async function GET(request: Request) {
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

  // Token var mı diye değil, gerçekten çalışıyor mu diye test et
  try {
    const oauth2Client = getOAuth2Client(origin);
    oauth2Client.setCredentials({ refresh_token: tokenRow.refresh_token });
    const cal = google.calendar({ version: "v3", auth: oauth2Client });
    await cal.events.list({ calendarId: "primary", maxResults: 1 });
    return NextResponse.json({ connected: true });
  } catch {
    return NextResponse.json({ connected: false, tokenExpired: true });
  }
}
