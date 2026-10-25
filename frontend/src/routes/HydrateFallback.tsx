import PageSkeleton from "@/components/ui/PageSkeleton";
import ShellSkeleton from "@/components/ui/ShellSkeleton";

// Shown while the first load restores the session and runs route loaders.
// Dashboard pages get the full frame; others (e.g. /auth) keep the plain skeleton.
export default function HydrateFallback() {
  return window.location.pathname.startsWith("/dashboard") ? <ShellSkeleton /> : <PageSkeleton />;
}
