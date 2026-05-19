"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { RequireAuth } from "@/components/require-auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-16">
      <RequireAuth>
        <div className="panel w-full rounded-[2.75rem] p-12 text-center shadow-panel">
          <Logo className="justify-center" iconSize={64} wordmarkClassName="text-5xl" />
          <p className="mt-5 text-xs uppercase tracking-[0.35em] text-lagoon">Roammate</p>
          <p className="section-title mt-4 text-4xl text-ink">Opening your dashboard…</p>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-stone-500">
            Pulling your active trips, joined groups, and the next decisions that need your input.
          </p>
        </div>
      </RequireAuth>
    </main>
  );
}
