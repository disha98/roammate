import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button, Panel, StatusBadge } from "@/components/ui";
import { getDashboardData } from "@/lib/queries/dashboard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function groupTrips(trips: Trip[]) {
  return trips.reduce<Record<string, Trip[]>>((acc, trip) => {
    acc[trip.groupName] = [...(acc[trip.groupName] ?? []), trip];
    return acc;
  }, {});
}

function getTripAttention(
  trip: Trip,
  profileId: string,
  availabilityProfileIds: Record<string, string[]>
): string | null {
  if (trip.status === "voting") return "Vote now";
  if (trip.status === "planning") {
    const profileIds = availabilityProfileIds[trip.id] ?? [];
    if (!profileIds.includes(profileId)) return "Add your dates";
  }
  if (trip.status === "collecting_members") return "Waiting for members";
  return null;
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const data = await getDashboardData(supabase, user.id);
  if (!data) redirect("/login");

  const { profile, created, joined, memberCounts, availabilityProfileIds } = data;
  const createdByGroup = groupTrips(created);
  const joinedByGroup = groupTrips(joined);

  return (
    <AppShell>
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel className="overflow-hidden">
          <div className="border-b border-ink/8 px-6 py-6">
            <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Dashboard</p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="section-title text-4xl text-ink">
                  Welcome back, {profile.displayName}.
                </h1>
                <p className="mt-2 max-w-lg text-sm text-stone-600">
                  Your trips at a glance — ones you created and ones you joined.
                </p>
              </div>
              <Button href="/trips/new">Create a trip</Button>
            </div>
          </div>
          <div className="grid gap-6 p-6 md:grid-cols-2">
            <TripColumn
              eyebrow="You're planning"
              empty="No trips yet. Create one to get started."
              groupedTrips={createdByGroup}
              memberCounts={memberCounts}
              profileId={profile.id}
              availabilityProfileIds={availabilityProfileIds}
            />
            <TripColumn
              eyebrow="You joined"
              empty="No invites yet. Trips you join will show up here."
              groupedTrips={joinedByGroup}
              memberCounts={memberCounts}
              profileId={profile.id}
              availabilityProfileIds={availabilityProfileIds}
            />
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel className="p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Trip Lifecycle</p>
            <ol className="mt-5 space-y-3 text-sm text-stone-600">
              <li>1. Create a trip and invite your group.</li>
              <li>2. Collect everyone&apos;s available dates.</li>
              <li>3. Add and compare destinations.</li>
              <li>4. Vote and lock the final plan.</li>
            </ol>
          </Panel>
          <Panel className="border border-ink/12 bg-white/95 p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Planning rhythm</p>
            <p className="mt-4 max-w-sm text-base leading-7 text-ink">
              Group first, dates second, destinations third — then vote and go.
            </p>
          </Panel>
        </div>
      </section>
    </AppShell>
  );
}

function TripColumn({
  eyebrow,
  groupedTrips,
  empty,
  memberCounts,
  profileId,
  availabilityProfileIds
}: {
  eyebrow: string;
  groupedTrips: Record<string, Trip[]>;
  empty: string;
  memberCounts: Record<string, number>;
  profileId: string;
  availabilityProfileIds: Record<string, string[]>;
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
                {trips.map((trip) => {
                  const memberCount = memberCounts[trip.id] ?? 0;
                  const attention = getTripAttention(trip, profileId, availabilityProfileIds);
                  return (
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
                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs uppercase tracking-[0.25em] text-stone-500">
                        <span>
                          {formatDate(trip.tentativeStart)} – {formatDate(trip.tentativeEnd)}
                        </span>
                        <span>{trip.tripDuration}d trip</span>
                        <span>{memberCount} {memberCount === 1 ? "member" : "members"}</span>
                      </div>
                      {attention && (
                        <p className="mt-2 text-xs font-medium text-coral">{attention}</p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
