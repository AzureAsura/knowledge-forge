import { Suspense, lazy, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "@/components/shared/Navbar";
import Sidebar from "@/components/shared/Sidebar";
import PageSkeleton from "@/components/ui/PageSkeleton";
import { myBadgesQuery } from "@/features/gamification/queries";

const LevelUpModal = lazy(() => import("@/components/gamification/LevelUpModal"));
const BadgeUnlockCard = lazy(() => import("@/components/gamification/BadgeUnlockCard"));

export default function DashboardLayout() {
  const { pathname } = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Keeps the badge list watched so a newly unlocked badge is announced on any page (see queryClient.ts).
  useQuery({ ...myBadgesQuery, select: () => null });

  return (
    // `h-screen` dan `overflow-hidden` di container utama mencegah scroll seluruh layar
    <div className="flex h-screen w-full bg-[#F0F2F5] text-[#1F2937] font-sans overflow-hidden">
      {/* Sidebar tetap di tempatnya */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Area kanan (Navbar + Content Area) */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Navbar sticky di paling atas */}
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} />

        {/* HANYA area main ini yang bisa di-scroll jika isinya panjang */}
        <main key={pathname} className="flex-1 p-4 sm:p-6 md:p-8 w-full overflow-y-auto space-y-6">
          <Suspense fallback={<PageSkeleton />}>
            <div key={pathname} className="page-in space-y-6">
              <Outlet />
            </div>
          </Suspense>
        </main>
        <Suspense fallback={null}>
          <LevelUpModal />
          <BadgeUnlockCard />
        </Suspense>
      </div>
    </div>
  );
}