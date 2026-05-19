import { AppShell } from "@/components/app-shell";
import { DashboardSkeleton } from "@/components/skeleton";

export default function DashboardLoading() {
  return (
    <AppShell>
      <div className="w-full max-w-6xl">
        <DashboardSkeleton />
      </div>
    </AppShell>
  );
}
