"use client";

import { cn } from "@/lib/utils";

export function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-4 animate-pulse rounded-full bg-stone-200/60",
        className
      )}
    />
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[2rem] bg-stone-200/40",
        className
      )}
    />
  );
}

export function SkeletonTripCard() {
  return (
    <div className="panel rounded-4xl p-6 shadow-panel">
      <SkeletonLine className="h-3 w-20" />
      <SkeletonLine className="mt-3 h-6 w-48" />
      <SkeletonLine className="mt-3 h-4 w-full" />
      <div className="mt-4 flex gap-2">
        <SkeletonBlock className="h-7 w-24 rounded-full" />
        <SkeletonBlock className="h-7 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonDestinationCard() {
  return (
    <div className="panel rounded-4xl overflow-hidden shadow-panel">
      <SkeletonBlock className="h-40 w-full rounded-none" />
      <div className="p-5">
        <SkeletonLine className="h-5 w-36" />
        <SkeletonLine className="mt-2 h-4 w-full" />
        <div className="mt-3 flex gap-2">
          <SkeletonBlock className="h-6 w-16 rounded-full" />
          <SkeletonBlock className="h-6 w-20 rounded-full" />
          <SkeletonBlock className="h-6 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div className="panel rounded-4xl p-8 shadow-panel">
      <div className="grid gap-6 md:grid-cols-[1fr_0.4fr]">
        <div>
          <SkeletonLine className="h-3 w-24" />
          <SkeletonLine className="mt-3 h-10 w-72" />
          <SkeletonLine className="mt-4 h-4 w-full max-w-md" />
          <SkeletonLine className="mt-2 h-4 w-3/4 max-w-sm" />
        </div>
        <div className="flex flex-col items-end gap-3">
          <SkeletonBlock className="h-7 w-32 rounded-full" />
          <SkeletonLine className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="panel rounded-4xl overflow-hidden shadow-panel">
        <div className="border-b border-ink/8 px-6 py-6">
          <SkeletonLine className="h-3 w-20" />
          <SkeletonLine className="mt-3 h-8 w-56" />
          <SkeletonLine className="mt-2 h-4 w-72" />
        </div>
        <div className="grid gap-6 p-6 md:grid-cols-2">
          <div className="space-y-4">
            <SkeletonLine className="h-3 w-28" />
            <SkeletonTripCard />
            <SkeletonTripCard />
          </div>
          <div className="space-y-4">
            <SkeletonLine className="h-3 w-24" />
            <SkeletonTripCard />
          </div>
        </div>
      </div>
      <div className="space-y-6">
        <div className="panel rounded-4xl p-6 shadow-panel">
          <SkeletonLine className="h-3 w-24" />
          <div className="mt-5 space-y-4">
            <SkeletonLine className="h-4 w-full" />
            <SkeletonLine className="h-4 w-5/6" />
            <SkeletonLine className="h-4 w-full" />
            <SkeletonLine className="h-4 w-4/6" />
          </div>
        </div>
        <div className="panel rounded-4xl p-6 shadow-panel">
          <SkeletonLine className="h-3 w-28" />
          <SkeletonLine className="mt-4 h-4 w-full" />
          <SkeletonLine className="mt-2 h-4 w-3/4" />
        </div>
      </div>
    </section>
  );
}
