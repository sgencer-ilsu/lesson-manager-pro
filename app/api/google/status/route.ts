import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ connected: false });

  const { data } = await supabase.from("google_tokens").select("user_id").eq("user_id", user.id).maybeSingle();
  return NextResponse.json({ connected: !!data });
}
