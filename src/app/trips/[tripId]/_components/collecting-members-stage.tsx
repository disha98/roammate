"use client";

import { Button, Panel } from "@/components/ui";
import { useAppState } from "@/context/app-state";
import type { TripStatus } from "@/lib/types";
import { inviteStatusLabel } from "./utils";

export function CollectingMembersStage({
  trip,
  members,
  invites,
  getInviteStatus,
  generatedLink,
  copied,
  setCopied,
  onGenerateLink,
  onRevokeInvite,
  onRemoveMember,
  onAdvanceToPlanning,
  isPlanner
}: {
  trip: NonNullable<ReturnType<ReturnType<typeof useAppState>["getTripById"]>>;
  members: ReturnType<ReturnType<typeof useAppState>["getTripMembers"]>;
  invites: ReturnType<ReturnType<typeof useAppState>["getTripInvites"]>;
  getInviteStatus: ReturnType<typeof useAppState>["getInviteStatus"];
  generatedLink: string;
  copied: boolean;
  setCopied: (value: boolean) => void;
  onGenerateLink: () => Promise<void>;
  onRevokeInvite: (inviteId: string) => Promise<void>;
  onRemoveMember: (tripId: string, profileId: string) => Promise<void>;
  onAdvanceToPlanning: (tripId: string, status: TripStatus) => Promise<void>;
  isPlanner: boolean;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Panel className="p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Who&apos;s in</p>
        <h2 className="section-title mt-2 text-3xl">Build the travel crew first.</h2>
        <p className="mt-3 text-sm text-stone-600">
          Once everyone has joined, this trip can move into dates and destination planning.
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {members.map(({ id, profile, role, profileId }) => (
            <div key={id} className="rounded-[1.6rem] border border-ink/8 bg-white/75 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-ink">{profile?.displayName}</p>
                  <p className="text-sm text-stone-500">{profile?.email}</p>
                </div>
                <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">
                  {role === "planner" ? "Planner" : "Member"}
                </span>
              </div>
              <p className="mt-3 text-sm text-stone-600">
                {profile?.homeCity || "City not added yet"} · Passport {profile?.passport || "not added yet"}
              </p>
              {isPlanner && role !== "planner" ? (
                <button
                  type="button"
                  className="mt-3 text-sm font-semibold text-coral"
                  onClick={() => void onRemoveMember(trip.id, profileId)}
                >
                  Remove from trip
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Invites</p>
        <h2 className="section-title mt-2 text-3xl">Bring everyone into the trip.</h2>
        {isPlanner ? (
          <>
            <div className="mt-5 rounded-[1.75rem] bg-mist p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Invite link</p>
                  <p className="text-xs text-stone-500">
                    Share this link with friends — they can preview the trip and join after signing in.
                  </p>
                </div>
                {!generatedLink && (
                  <Button variant="secondary" onClick={() => void onGenerateLink()}>
                    Generate link
                  </Button>
                )}
              </div>
              {generatedLink && (
                <div className="mt-3 flex items-center gap-2">
                  <p className="flex-1 break-all rounded-2xl bg-white px-3 py-2 text-sm text-stone-700">
                    {generatedLink}
                  </p>
                  <button
                    type="button"
                    className="shrink-0 rounded-full bg-lagoon px-4 py-2 text-sm font-semibold text-white transition hover:bg-lagoon/85"
                    onClick={() => {
                      void navigator.clipboard.writeText(generatedLink);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-[1.75rem] bg-mist p-4 text-sm text-stone-700">
            The planner is still gathering the group. Once everyone is here, the trip will move
            into planning.
          </div>
        )}
        {isPlanner && invites.length > 0 ? (
          <div className="mt-5">
            <p className="text-sm font-semibold text-ink">Invite activity</p>
            <div className="mt-3 space-y-2">
              {invites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 px-3 py-2 text-sm text-stone-600">
                  <span>
                    Share link · {inviteStatusLabel(getInviteStatus(invite))}
                  </span>
                  {getInviteStatus(invite) === "pending" ? (
                    <button
                      type="button"
                      className="font-semibold text-coral"
                      onClick={() => void onRevokeInvite(invite.id)}
                    >
                      Revoke
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mt-5 rounded-[1.75rem] bg-ink p-4 text-white">
          <p className="text-sm uppercase tracking-[0.3em] text-sun">Next step</p>
          <p className="mt-2 text-sm text-stone-200">
            When the group is in place, move this trip to Planning so everyone can share dates and
            compare destinations.
          </p>
          {isPlanner ? (
            <Button className="mt-4" onClick={() => void onAdvanceToPlanning(trip.id, "planning")}>
              Move to planning
            </Button>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
