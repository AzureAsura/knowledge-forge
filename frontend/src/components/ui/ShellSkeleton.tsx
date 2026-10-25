import PageSkeleton from "@/components/ui/PageSkeleton";
import Skeleton from "@/components/ui/Skeleton";

// Mirrors DashboardLayout (Sidebar + Navbar + content) so a refresh shows the whole frame while the session and first page load.
export default function ShellSkeleton() {
  return (
    <div className="flex h-screen w-full bg-[#F0F2F5] overflow-hidden" aria-busy="true" aria-label="Loading">
      <aside className="hidden lg:flex w-[260px] shrink-0 flex-col justify-between bg-base neu-raised border-r border-[#E5E7EB]/50 p-5">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-[14px]" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3.5 w-20 rounded-full" />
              <Skeleton className="h-2.5 w-28 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-24 rounded-[20px]" />
          <div className="space-y-2">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-10 rounded-[16px]" />
            ))}
          </div>
        </div>
        <Skeleton className="h-16 rounded-[20px]" />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="px-4 md:px-8 py-3 border-b border-[#E5E7EB]/70 flex items-center justify-between gap-6 shrink-0">
          <Skeleton className="h-10 flex-1 max-w-lg rounded-[14px]" />
          <div className="flex items-center gap-3 md:gap-4">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-10 w-24 sm:w-40 rounded-[12px]" />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          <PageSkeleton />
        </main>
      </div>
    </div>
  );
}
