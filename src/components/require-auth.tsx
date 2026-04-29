"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/context/app-state";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { currentProfile, isReady } = useAppState();
  const router = useRouter();

  useEffect(() => {
    if (!isReady || currentProfile) {
      return;
    }

    const next = `${window.location.pathname}${window.location.search}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [currentProfile, isReady, router]);

  if (!isReady || !currentProfile) {
    return (
      <div className="panel rounded-[2rem] p-10 text-center shadow-panel">
        <p className="text-sm uppercase tracking-[0.3em] text-lagoon">Checking session</p>
        <p className="mt-3 section-title text-3xl">Loading your planning workspace…</p>
      </div>
    );
  }

  return <>{children}</>;
}
