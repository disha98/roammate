"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button, Panel } from "@/components/ui";
import { useAppState } from "@/context/app-state";
import type { DateWindowOption } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function VotingStage({
  trip,
  members,
  shortlist,
  dateOptions,
  destinationVote,
  dateVote,
  destinationVotes,
  dateVotes,
  onVote,
  isPlanner,
  onLockDecision,
  lastLockedDestinationLabel,
  lastLockedDateLabel
}: {
  trip: NonNullable<ReturnType<ReturnType<typeof useAppState>["getTripById"]>>;
  members: ReturnType<ReturnType<typeof useAppState>["getTripMembers"]>;
  shortlist: ReturnType<ReturnType<typeof useAppState>["getTripDestinations"]>;
  dateOptions: DateWindowOption[];
  destinationVote: string | undefined;
  dateVote: string | undefined;
  destinationVotes: ReturnType<ReturnType<typeof useAppState>["getVotesForTrip"]>;
  dateVotes: ReturnType<ReturnType<typeof useAppState>["getVotesForTrip"]>;
  onVote: (tripId: string, type: "destination" | "date_window", optionId: string) => Promise<void>;
  isPlanner: boolean;
  onLockDecision: (
    tripId: string,
    input: { destinationId: string; dateOptionId: string }
  ) => Promise<void>;
  lastLockedDestinationLabel?: string;
  lastLockedDateLabel?: string;
}) {
  const destinationOptions = shortlist
    .filter((entry) => entry.destination)
    .map((entry) => ({
      id: entry.destinationId,
      label: `${entry.destination?.city}, ${entry.destination?.country}`,
      votes: destinationVotes.filter((vote) => vote.optionId === entry.destinationId).length
    }));
  const dateVoteOptions = dateOptions.map((option) => ({
    id: option.id,
    label: `${formatDate(option.startDate)} to ${formatDate(option.endDate)}`,
    votes: dateVotes.filter((vote) => vote.optionId === option.id).length
  }));
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [lockedDestinationId, setLockedDestinationId] = useState(
    trip.finalDestinationId ?? destinationOptions[0]?.id ?? ""
  );
  const [lockedDateOptionId, setLockedDateOptionId] = useState(() => {
    if (trip.finalDateStart && trip.finalDateEnd) {
      return (
        dateOptions.find(
          (option) =>
            option.startDate === trip.finalDateStart && option.endDate === trip.finalDateEnd
        )?.id ?? dateVoteOptions[0]?.id ?? ""
      );
    }

    return dateVoteOptions[0]?.id ?? "";
  });
  const selectedLockedDestinationId =
    lockedDestinationId && destinationOptions.some((option) => option.id === lockedDestinationId)
      ? lockedDestinationId
      : trip.finalDestinationId ?? destinationOptions[0]?.id ?? "";
  const selectedLockedDateOptionId =
    lockedDateOptionId && dateVoteOptions.some((option) => option.id === lockedDateOptionId)
      ? lockedDateOptionId
      : trip.finalDateStart && trip.finalDateEnd
        ? dateOptions.find(
            (option) =>
              option.startDate === trip.finalDateStart && option.endDate === trip.finalDateEnd
          )?.id ?? dateVoteOptions[0]?.id ?? ""
        : dateVoteOptions[0]?.id ?? "";

  return (
    <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
      <Panel className="p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Ready to decide</p>
        <h2 className="section-title mt-2 text-3xl">Cast the final votes.</h2>
        <p className="mt-3 text-sm text-stone-600">
          Everyone can now choose the best destination and the best date window from the narrowed
          list.
        </p>
        <div className="mt-5 space-y-3">
          {members.map(({ id, profile }) => (
            <div key={id} className="rounded-2xl bg-mist px-3 py-3 text-sm text-stone-700">
              {profile?.displayName}
            </div>
          ))}
        </div>
        {lastLockedDestinationLabel || lastLockedDateLabel ? (
          <div className="mt-5 rounded-[1.6rem] bg-white/80 p-4 text-sm text-stone-700">
            <p className="font-semibold text-ink">Last locked decision</p>
            <p className="mt-2">
              {lastLockedDestinationLabel ?? "Destination not locked yet"}
            </p>
            <p className="mt-1">
              {lastLockedDateLabel ?? "Dates not locked yet"}
            </p>
          </div>
        ) : null}
      </Panel>
      <Panel className="p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <VoteCard
            title="Destination vote"
            empty="The planner needs to shortlist destinations before voting opens."
            options={destinationOptions}
            selectedId={destinationVote}
            onSelect={(optionId) => void onVote(trip.id, "destination", optionId)}
          />
          <VoteCard
            title="Date vote"
            empty="Date voting will open once good overlap windows are available."
            options={dateVoteOptions}
            selectedId={dateVote}
            onSelect={(optionId) => void onVote(trip.id, "date_window", optionId)}
          />
        </div>
        {isPlanner ? (
          <div className="mt-6 rounded-[1.8rem] bg-mist p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-lagoon">Review and lock</p>
            <p className="mt-2 text-sm text-stone-600">
              Vote counts guide the decision, but the planner locks the final destination and date
              window that the group will use.
            </p>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-ink">Final destination</p>
                {destinationOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`w-full rounded-[1.4rem] border px-4 py-3 text-left text-sm transition ${
                      selectedLockedDestinationId === option.id
                        ? "border-lagoon bg-lagoon/10 text-lagoon"
                        : "border-ink/8 bg-white text-stone-700"
                    }`}
                    onClick={() => setLockedDestinationId(option.id)}
                  >
                    <span>{option.label}</span>
                    <span className="ml-2 text-xs uppercase tracking-[0.2em] text-stone-500">
                      {option.votes} votes
                    </span>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-ink">Final dates</p>
                {dateVoteOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`w-full rounded-[1.4rem] border px-4 py-3 text-left text-sm transition ${
                      selectedLockedDateOptionId === option.id
                        ? "border-lagoon bg-lagoon/10 text-lagoon"
                        : "border-ink/8 bg-white text-stone-700"
                    }`}
                    onClick={() => setLockedDateOptionId(option.id)}
                  >
                    <span>{option.label}</span>
                    <span className="ml-2 text-xs uppercase tracking-[0.2em] text-stone-500">
                      {option.votes} votes
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <Button
              className="mt-4"
              disabled={!selectedLockedDestinationId || !selectedLockedDateOptionId}
              onClick={() => setShowLockConfirm(true)}
            >
              Lock final trip
            </Button>
            <ConfirmDialog
              open={showLockConfirm}
              title="Lock this decision?"
              message="This finalizes the destination and dates for the group. You can reopen voting later if needed."
              confirmLabel="Lock it in"
              onConfirm={() => {
                setShowLockConfirm(false);
                void onLockDecision(trip.id, {
                  destinationId: selectedLockedDestinationId,
                  dateOptionId: selectedLockedDateOptionId
                });
              }}
              onCancel={() => setShowLockConfirm(false)}
            />
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

function VoteCard({
  title,
  empty,
  options,
  selectedId,
  onSelect
}: {
  title: string;
  empty: string;
  options: { id: string; label: string; votes: number }[];
  selectedId: string | undefined;
  onSelect: (optionId: string) => void;
}) {
  return (
    <div className="rounded-[1.8rem] bg-white/80 p-5">
      <p className="text-sm uppercase tracking-[0.35em] text-lagoon">{title}</p>
      <div className="mt-4 space-y-3">
        {options.length === 0 ? (
          <p className="text-sm text-stone-500">{empty}</p>
        ) : (
          options.map((option) => (
            <button
              key={option.id}
              className={`flex w-full items-center justify-between rounded-[1.5rem] border px-4 py-3 text-left text-sm transition ${
                selectedId === option.id ? "border-lagoon bg-lagoon/10" : "border-ink/8 bg-mist"
              }`}
              onClick={() => onSelect(option.id)}
              type="button"
            >
              <span>{option.label}</span>
              <span>{option.votes} votes</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
