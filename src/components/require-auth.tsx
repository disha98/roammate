"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/context/app-state";
import { Logo } from "@/components/logo";

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
      <div className="fixed inset-0 z-40 flex items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="texture absolute inset-0 -z-10 opacity-40" />
        <div className="panel w-full max-w-2xl rounded-[2.4rem] p-10 text-center shadow-panel">
          <Logo className="justify-center" iconSize={42} wordmarkClassName="text-4xl" />
          <p className="mt-6 text-sm uppercase tracking-[0.3em] text-lagoon">Checking session</p>
          <p className="mt-3 section-title text-3xl">Loading your planning workspace…</p>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-stone-500">
            We&apos;re confirming your account and reopening the trips, dates, and destination context tied to it.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
