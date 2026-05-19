"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppState } from "@/context/app-state";
import { Button } from "@/components/ui";
import { Logo } from "@/components/logo";
import { cn, getInitials } from "@/lib/utils";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "All your trips and what needs attention."
  },
  {
    href: "/trips/new",
    label: "New trip",
    description: "Start planning with your group."
  }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentProfile, logout } = useAppState();

  return (
    <div className="min-h-screen">
      <div className="texture absolute inset-0 -z-10 opacity-40" />
      <div className="flex min-h-screen w-full gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="panel hidden w-72 rounded-[2rem] p-6 shadow-panel lg:flex lg:flex-col">
          <div>
            <Logo iconSize={28} wordmarkClassName="text-[1.85rem]" />
            <p className="mt-3 text-sm leading-6 text-stone-500">
              Plan trips together.
            </p>
          </div>
          <div className="mt-8">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Navigate</p>
          </div>
          <nav className="mt-4 space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-[1.6rem] px-4 py-3 transition",
                  pathname === item.href
                    ? "bg-ink text-white shadow-sm"
                    : "bg-white/45 text-ink/75 hover:bg-white/80 hover:text-ink"
                )}
              >
                <p className="text-sm font-semibold">{item.label}</p>
                <p
                  className={cn(
                    "mt-1 text-xs leading-5",
                    pathname === item.href ? "text-white/75" : "text-stone-500"
                  )}
                >
                  {item.description}
                </p>
              </Link>
            ))}
          </nav>
          <div className="mt-auto space-y-3">
            <Link
              href="/profile"
              className={cn(
                "flex items-start gap-3 rounded-3xl px-4 py-3 transition",
                pathname === "/profile"
                  ? "bg-white/95 text-ink shadow-sm"
                  : "bg-white/60 text-ink/70 hover:bg-white/80 hover:text-ink"
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mist text-lg">
                ⚙
              </span>
              <span>
                <span className="block text-sm font-semibold">Profile & settings</span>
                <span className="mt-0.5 block text-xs text-stone-500">
                  Home city, passport, availability.
                </span>
              </span>
            </Link>
            <div className="rounded-3xl bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Signed in as</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-ink text-sm font-semibold text-white">
                {currentProfile?.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentProfile.photoUrl} alt={currentProfile.displayName} className="h-full w-full object-cover" />
                ) : (
                  getInitials(currentProfile?.displayName ?? "R")
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-ink">{currentProfile?.displayName}</p>
                <p className="text-sm text-stone-500">{currentProfile?.email}</p>
              </div>
            </div>
            <Button className="mt-4 w-full" variant="secondary" onClick={() => void logout()}>
              Log out
            </Button>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <header className="panel mb-6 flex items-center justify-between rounded-[2rem] px-5 py-4 shadow-panel lg:hidden">
            <Logo iconSize={24} wordmarkClassName="text-2xl" />
            <Button href="/trips/new">New Trip</Button>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
