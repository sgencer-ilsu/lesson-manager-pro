"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ensureRecurringInstances, materializeDue, deduplicatePlanned, revertFutureMaterializations } from "@/lib/data";
import SidebarAgenda from "./SidebarAgenda";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/students", label: "Öğrenciler" },
  { href: "/calendar", label: "Takvim" },
  { href: "/lessons", label: "Dersler" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [googleOk, setGoogleOk] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function checkGoogle() {
    try {
      const res = await fetch("/api/google/status");
      const json = await res.json();
      setGoogleOk(json.connected === true);
    } catch {
      setGoogleOk(false);
    }
  }

  async function manualResync() {
    setSyncing(true);
    try {
      await fetch("/api/google/resync", { method: "POST" });
      await checkGoogle();
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    async function run() {
      try {
        await deduplicatePlanned(supabase);
        await revertFutureMaterializations(supabase);
        await ensureRecurringInstances(supabase);
        await materializeDue(supabase);
        fetch("/api/google/resync", { method: "POST" }).catch(() => {});
      } catch {
        // sessizce geç — bir sonraki tetiklemede tekrar denenecek
      }
    }
    run();
    checkGoogle();
    const interval = setInterval(run, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <aside className="hidden md:flex w-[260px] shrink-0 border-r border-[#1a2338] bg-[#0c1424] flex-col py-5 px-3 h-screen sticky top-0 overflow-hidden">
      <div className="flex items-center gap-2 px-2 mb-8 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-black text-sm">
          SG
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-bold text-white">S.GENCER</div>
          <div className="text-[10px] text-muted tracking-wide">DERS TAKİP</div>
        </div>
      </div>

      <nav className="nav-group shrink-0">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`nav-btn ${active ? "active" : ""}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <SidebarAgenda />

      {/* Google Takvim durumu */}
      <div className="mt-3 px-2 shrink-0">
        {googleOk === false ? (
          <div className="rounded-lg bg-red-950/50 border border-red-800/50 px-3 py-2 text-xs">
            <div className="text-red-300 font-semibold mb-1">⚠ Google Takvim bağlı değil</div>
            <a
              href="/api/google/connect"
              className="text-blue-400 underline hover:text-blue-300"
            >
              Yeniden bağlan
            </a>
          </div>
        ) : googleOk === true ? (
          <button
            onClick={manualResync}
            disabled={syncing}
            className="w-full text-left text-[11px] text-muted hover:text-white px-1 py-1 transition-colors"
          >
            {syncing ? "⏳ Senkronize ediliyor…" : "✓ Google Takvim bağlı · Sync"}
          </button>
        ) : null}
      </div>

      <div className="border-t border-[#1a2338] mt-3 pt-3 shrink-0">
        <button onClick={signOut} className="nav-btn w-full text-red-300 hover:text-red-200 hover:bg-[#241621]">
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
