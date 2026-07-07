"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SidebarAgenda from "./SidebarAgenda";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/students", label: "Öğrenciler" },
  { href: "/calendar", label: "Takvim" },
  { href: "/lessons", label: "Dersler" },
  { href: "/reports", label: "Raporlar" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-[260px] shrink-0 border-r border-[#1a2338] bg-[#0c1424] flex flex-col py-5 px-3 h-screen sticky top-0 overflow-hidden">
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

      <div className="border-t border-[#1a2338] mt-3 pt-3 shrink-0">
        <button onClick={signOut} className="nav-btn w-full text-red-300 hover:text-red-200 hover:bg-[#241621]">
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
