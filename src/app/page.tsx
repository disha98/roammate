import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
      <div className="panel overflow-hidden rounded-[2.5rem] shadow-panel">
        <div className="grid gap-10 p-8 md:grid-cols-[1.1fr_0.9fr] md:p-12">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-lagoon">Roammate</p>
            <h1 className="section-title mt-4 max-w-2xl text-5xl leading-tight text-ink md:text-7xl">
              Plan the whole group trip in one place.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-stone-600">
              Track multiple trips, collect availability, compare destinations, and close the loop
              with a final vote.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
              >
                Enter the dashboard
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-ink/10 bg-white/80 px-5 py-3 text-sm font-semibold text-ink"
              >
                Switch planner profile
              </Link>
            </div>
          </div>
          <div className="rounded-[2rem] bg-ink p-6 text-white">
            <p className="text-sm uppercase tracking-[0.3em] text-sun">What you can do here</p>
            <ul className="mt-6 space-y-4 text-sm text-stone-200">
              <li>Multiple trips split between ones you created and ones you joined</li>
              <li>Invite by email or shareable link with preview-before-join</li>
              <li>Trip workspace with members, availability, destinations, and voting</li>
              <li>Move each trip from invites to planning to a final decision</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
