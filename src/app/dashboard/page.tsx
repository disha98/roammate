"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { Button, Panel, StatusBadge } from "@/components/ui";
import { useAppState } from "@/context/app-state";
import { formatDate } from "@/lib/utils";

function groupTrips(trips: ReturnType<ReturnType<typeof useAppState>["getVisibleTrips"]>["created"]) {
  return trips.reduce<Record<string, typeof trips>>((acc, trip) => {
    acc[trip.groupName] = [...(acc[trip.groupName] ?? []), trip];
    return acc;
  }, {});
}

export default function DashboardPage() {
  const { currentProfile, getVisibleTrips } = useAppState();
  const { created, joined } = getVisibleTrips();
  const createdByGroup = groupTrips(created);
  const joinedByGroup = groupTrips(joined);

  return (
    <RequireAuth>
      <AppShell>
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Panel className="overflow-hidden">
            <div className="border-b border-ink/8 px-6 py-6">
              <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Dashboard</p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="section-title text-4xl text-ink">
                    {currentProfile?.displayName}, here’s every trip thread in motion.
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-stone-600">
                    Created trips stay separate from ones you joined, and each friend circle keeps
                    its own lane.
                  </p>
                </div>
                <Button href="/trips/new">Create a trip</Button>
              </div>
            </div>
            <div className="grid gap-6 p-6 md:grid-cols-2">
              <TripColumn
                eyebrow="You’re planning"
                empty="No active planner trips yet."
                groupedTrips={createdByGroup}
              />
              <TripColumn
                eyebrow="You joined"
                empty="Nothing shared with you yet."
                groupedTrips={joinedByGroup}
              />
            </div>
          </Panel>
          <div className="space-y-6">
            <Panel className="p-6">
              <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Trip Lifecycle</p>
              <ol className="mt-5 space-y-4 text-sm text-stone-600">
                <li>1. Draft the trip and define the group context.</li>
                <li>2. Invite people by email or link and collect members.</li>
                <li>3. Move into planning with availability and destination options.</li>
                <li>4. Narrow the shortlist and run final voting.</li>
              </ol>
            </Panel>
            <Panel className="border border-ink/12 bg-white/95 p-6">
              <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Planning rhythm</p>
              <p className="mt-4 max-w-sm text-base leading-7 text-ink">
                Start with the group, move into dates and destinations, then narrow to a final vote
                once the strongest options are visible.
              </p>
            </Panel>
          </div>
        </section>
      </AppShell>
    </RequireAuth>
  );
}

function TripColumn({
  eyebrow,
  groupedTrips,
  empty
}: {
  eyebrow: string;
  groupedTrips: Record<string, ReturnType<ReturnType<typeof useAppState>["getVisibleTrips"]>["created"]>;
  empty: string;
}) {
  const groups = Object.entries(groupedTrips);

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.35em] text-stone-500">{eyebrow}</p>
      {groups.length === 0 ? (
        <div className="mt-4 rounded-[2rem] border border-dashed border-ink/10 bg-white/50 p-6 text-sm text-stone-500">
          {empty}
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {groups.map(([groupName, trips]) => (
            <div key={groupName}>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-lagoon">
                {groupName}
              </p>
              <div className="space-y-3">
                {trips.map((trip) => (
                  <Link
                    key={trip.id}
                    href={`/trips/${trip.id}`}
                    className="block rounded-[1.75rem] border border-ink/8 bg-white/75 p-4 transition hover:-translate-y-0.5 hover:border-lagoon"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-ink">{trip.title}</p>
                        <p className="mt-1 text-sm text-stone-600">{trip.summary}</p>
                      </div>
                      <StatusBadge status={trip.status} />
                    </div>
                    <p className="mt-4 text-xs uppercase tracking-[0.25em] text-stone-500">
                      {formatDate(trip.tentativeStart)} to {formatDate(trip.tentativeEnd)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
