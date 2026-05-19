"use client";

import { Button, Panel } from "@/components/ui";
import { useAppState } from "@/context/app-state";
import { formatDate } from "@/lib/utils";

export function DecidedStage({
  trip,
  members,
  onReopenDecision,
  isPlanner
}: {
  trip: NonNullable<ReturnType<ReturnType<typeof useAppState>["getTripById"]>>;
  members: ReturnType<ReturnType<typeof useAppState>["getTripMembers"]>;
  onReopenDecision: (tripId: string) => Promise<void>;
  isPlanner: boolean;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <Panel className="p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Decision</p>
        <h2 className="section-title mt-2 text-3xl">The trip has a direction.</h2>
        <div className="mt-5 space-y-4">
          <div className="rounded-[1.8rem] bg-mist p-4">
            <p className="text-sm font-semibold text-ink">Chosen destination</p>
            <p className="mt-2 text-lg text-stone-700">
              {trip.finalDestinationSnapshot
                ? `${trip.finalDestinationSnapshot.city}, ${trip.finalDestinationSnapshot.country}`
                : "No destination chosen yet"}
            </p>
          </div>
          <div className="rounded-[1.8rem] bg-mist p-4">
            <p className="text-sm font-semibold text-ink">Chosen dates</p>
            <p className="mt-2 text-lg text-stone-700">
              {trip.finalDateStart && trip.finalDateEnd
                ? `${formatDate(trip.finalDateStart)} to ${formatDate(trip.finalDateEnd)}`
                : `Target window remains ${formatDate(trip.tentativeStart)} to ${formatDate(trip.tentativeEnd)}`}
            </p>
          </div>
        </div>
        {isPlanner ? (
          <Button className="mt-5" variant="secondary" onClick={() => void onReopenDecision(trip.id)}>
            Reopen decision
          </Button>
        ) : null}
      </Panel>
      <Panel className="p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Group</p>
        <h2 className="section-title mt-2 text-3xl">Everyone who helped shape it.</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {members.map(({ id, profile, role }) => (
            <div key={id} className="rounded-[1.6rem] border border-ink/8 bg-white/75 p-4">
              <p className="text-base font-semibold text-ink">{profile?.displayName}</p>
              <p className="mt-1 text-sm text-stone-500">{role === "planner" ? "Planner" : "Member"}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
