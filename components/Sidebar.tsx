"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "◧" },
  { href: "/students", label: "Öğrenciler", icon: "◔" },
  { href: "/calendar", label: "Takvim", icon: "▦" },
  { href: "/lessons", label: "Dersler", icon: "☰" },
  { href: "/reports", label: "Raporlar", icon: "▤" },
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
    <aside className="w-[220px] shrink-0 border-r border-[#1a2338] bg-[#0c1424] flex flex-col py-5 px-3">
      <div className="flex items-center gap-2 px-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-black text-sm">
          SG
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-bold text-white">S.GENCER</div>
          <div className="text-[10px] text-muted tracking-wide">DERS TAKİP</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`nav-btn ${active ? "active" : ""}`}>
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button onClick={signOut} className="nav-btn text-red-300 hover:text-red-200 hover:bg-[#241621]">
        <span className="w-5 text-center">⏻</span>
        Çıkış Yap
      </button>
    </aside>
  );
}
