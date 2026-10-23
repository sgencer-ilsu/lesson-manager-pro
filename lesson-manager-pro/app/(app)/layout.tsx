import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 px-4 py-4 pb-24 md:px-9 md:py-7 md:pb-7">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
