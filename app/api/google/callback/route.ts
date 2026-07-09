import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOAuth2Client } from "@/lib/google";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(`${origin}/calendar?google=error`);
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== state) {
    return NextResponse.redirect(`${origin}/calendar?google=error`);
  }

  try {
    const oauth2Client = getOAuth2Client(origin);
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      // Kullanıcı daha önce izin vermişse Google bazen yeni refresh_token vermez.
      // prompt=consent bunu engellemek için ekli ama garanti olsun diye kontrol ediyoruz.
      return NextResponse.redirect(`${origin}/calendar?google=reconnect`);
    }

    await supabase.from("google_tokens").upsert({
      user_id: user.id,
      refresh_token: tokens.refresh_token,
    });

    // İlk bağlantıda mevcut dersleri hemen Google Takvim'e gönder.
    await fetch(`${origin}/api/google/resync`, {
      method: "POST",
      headers: { cookie: request.headers.get("cookie") || "" },
    }).catch(() => {});

    return NextResponse.redirect(`${origin}/calendar?google=connected`);
  } catch (err) {
    return NextResponse.redirect(`${origin}/calendar?google=error`);
  }
}
