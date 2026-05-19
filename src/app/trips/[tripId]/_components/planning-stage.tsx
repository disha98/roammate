"use client";

import { FormEvent } from "react";
import { Button, Input, Panel } from "@/components/ui";
import { useAppState } from "@/context/app-state";
import type {
  DateWindowOption,
  DestinationCatalogItem,
  RecommendedDestination
} from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { DestinationBoard } from "./destination-board";

export function PlanningStage({
  trip,
  currentProfileId,
  members,
  availabilityByMember,
  suggestedAvailability,
  dateOptions,
  finalDateOptions,
  rangeStart,
  setRangeStart,
  rangeEnd,
  setRangeEnd,
  onSubmitAvailability,
  onUseSuggestedAvailability,
  onRemoveAvailability,
  onToggleFinalDateOption,
  tripDestinations,
  destinationQuery,
  setDestinationQuery,
  destinationResults,
  isSearchingDestinations,
  destinationSearchMessage,
  selectedDestination,
  onSelectDestination,
  destinationNote,
  setDestinationNote,
  onSubmitDestination,
  recommendedDestinations,
  showRecommendations,
  isLoadingRecommendations,
  onAddRecommendedDestination,
  onToggleShortlist,
  isPlanner,
  canOpenVoting,
  onOpenVoting
}: {
  trip: NonNullable<ReturnType<ReturnType<typeof useAppState>["getTripById"]>>;
  currentProfileId: string | undefined;
  members: ReturnType<ReturnType<typeof useAppState>["getTripMembers"]>;
  availabilityByMember: {
    member: ReturnType<ReturnType<typeof useAppState>["getTripMembers"]>[number];
    ranges: ReturnType<ReturnType<typeof useAppState>["getTripAvailability"]>;
  }[];
  suggestedAvailability: { label: string; startDate: string; endDate: string; sourceWindowId: string }[];
  dateOptions: DateWindowOption[];
  finalDateOptions: DateWindowOption[];
  rangeStart: string;
  setRangeStart: (value: string) => void;
  rangeEnd: string;
  setRangeEnd: (value: string) => void;
  onSubmitAvailability: (event: FormEvent<HTMLFormElement>) => void;
  onUseSuggestedAvailability: (startDate: string, endDate: string) => void;
  onRemoveAvailability: (rangeId: string) => void;
  onToggleFinalDateOption: (optionId: string) => void;
  tripDestinations: ReturnType<ReturnType<typeof useAppState>["getTripDestinations"]>;
  destinationQuery: string;
  setDestinationQuery: (value: string) => void;
  destinationResults: DestinationCatalogItem[];
  isSearchingDestinations: boolean;
  destinationSearchMessage: string;
  selectedDestination: DestinationCatalogItem | null;
  onSelectDestination: (value: DestinationCatalogItem | null) => void;
  destinationNote: string;
  setDestinationNote: (value: string) => void;
  onSubmitDestination: (event: FormEvent<HTMLFormElement>) => void;
  recommendedDestinations: RecommendedDestination[];
  showRecommendations: boolean;
  isLoadingRecommendations: boolean;
  onAddRecommendedDestination: (destination: DestinationCatalogItem) => Promise<void>;
  onToggleShortlist: (tripDestinationId: string) => void;
  isPlanner: boolean;
  canOpenVoting: boolean;
  onOpenVoting: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <PlanningSidebar
          trip={trip}
          currentProfileId={currentProfileId}
          availabilityByMember={availabilityByMember}
          suggestedAvailability={suggestedAvailability}
          dateOptions={dateOptions}
          finalDateOptions={finalDateOptions}
          isPlanner={isPlanner}
          rangeStart={rangeStart}
          setRangeStart={setRangeStart}
          rangeEnd={rangeEnd}
          setRangeEnd={setRangeEnd}
          onSubmitAvailability={onSubmitAvailability}
          onUseSuggestedAvailability={onUseSuggestedAvailability}
          onRemoveAvailability={onRemoveAvailability}
          onToggleFinalDateOption={onToggleFinalDateOption}
        />
        <DestinationBoard
          trip={trip}
          members={members}
          tripDestinations={tripDestinations}
          destinationQuery={destinationQuery}
          setDestinationQuery={setDestinationQuery}
          destinationResults={destinationResults}
          isSearchingDestinations={isSearchingDestinations}
          destinationSearchMessage={destinationSearchMessage}
          selectedDestination={selectedDestination}
          onSelectDestination={onSelectDestination}
          destinationNote={destinationNote}
          setDestinationNote={setDestinationNote}
          onSubmitDestination={onSubmitDestination}
          recommendedDestinations={recommendedDestinations}
          showRecommendations={showRecommendations}
          isLoadingRecommendations={isLoadingRecommendations}
          onAddRecommendedDestination={onAddRecommendedDestination}
          onToggleShortlist={onToggleShortlist}
          isPlanner={isPlanner}
        />
      </div>
      {isPlanner ? (
        <Panel className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-lagoon">Ready for the final call?</p>
              <p className="mt-2 text-sm text-stone-600">
                {canOpenVoting
                  ? "The shortlist and date windows are set. Open voting so the group can decide."
                  : "Choose at least one shortlisted destination and one final date window before voting opens."}
              </p>
            </div>
            <Button disabled={!canOpenVoting} onClick={onOpenVoting}>
              Open voting
            </Button>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function PlanningSidebar({
  trip,
  currentProfileId,
  availabilityByMember,
  suggestedAvailability,
  dateOptions,
  finalDateOptions,
  isPlanner,
  rangeStart,
  setRangeStart,
  rangeEnd,
  setRangeEnd,
  onSubmitAvailability,
  onUseSuggestedAvailability,
  onRemoveAvailability,
  onToggleFinalDateOption
}: {
  trip: NonNullable<ReturnType<ReturnType<typeof useAppState>["getTripById"]>>;
  currentProfileId: string | undefined;
  availabilityByMember: {
    member: ReturnType<ReturnType<typeof useAppState>["getTripMembers"]>[number];
    ranges: ReturnType<ReturnType<typeof useAppState>["getTripAvailability"]>;
  }[];
  suggestedAvailability: { label: string; startDate: string; endDate: string; sourceWindowId: string }[];
  dateOptions: DateWindowOption[];
  finalDateOptions: DateWindowOption[];
  isPlanner: boolean;
  rangeStart: string;
  setRangeStart: (value: string) => void;
  rangeEnd: string;
  setRangeEnd: (value: string) => void;
  onSubmitAvailability: (event: FormEvent<HTMLFormElement>) => void;
  onUseSuggestedAvailability: (startDate: string, endDate: string) => void;
  onRemoveAvailability: (rangeId: string) => void;
  onToggleFinalDateOption: (optionId: string) => void;
}) {
  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Dates</p>
        <h2 className="section-title mt-2 text-3xl">See when the trip can actually happen.</h2>
        <p className="mt-3 text-sm text-stone-600">
          Everyone can add one or more date ranges inside the target window.
        </p>
        {suggestedAvailability.length > 0 ? (
          <div className="mt-5 rounded-[1.8rem] bg-mist p-4">
            <p className="text-sm font-semibold text-ink">From your profile</p>
            <div className="mt-3 space-y-2">
              {suggestedAvailability.map((suggestion) => (
                <div
                  key={suggestion.sourceWindowId}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-3 text-sm text-stone-700"
                >
                  <div>
                    <p className="font-semibold text-ink">{suggestion.label}</p>
                    <p>
                      {formatDate(suggestion.startDate)} to {formatDate(suggestion.endDate)}
                    </p>
                  </div>
                  <button
                    className="font-semibold text-lagoon"
                    onClick={() => onUseSuggestedAvailability(suggestion.startDate, suggestion.endDate)}
                    type="button"
                  >
                    Use these dates
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <form className="mt-5 grid gap-3" onSubmit={onSubmitAvailability}>
          <Input type="date" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} />
          <Input type="date" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} />
          <Button type="submit">Save my dates</Button>
        </form>
      </Panel>
      <Panel className="p-6">
        <p className="text-sm font-semibold text-ink">Best matching windows</p>
        <div className="mt-3 space-y-2">
          {dateOptions.length === 0 ? (
            <p className="text-sm text-stone-500">No overlap yet. More people need to add dates.</p>
          ) : (
            dateOptions.map((window) => (
              <button
                key={window.id}
                type="button"
                onClick={() => onToggleFinalDateOption(window.id)}
                disabled={!isPlanner}
                className={`w-full rounded-2xl px-3 py-3 text-left text-sm ${
                  finalDateOptions.some((option) => option.id === window.id)
                    ? "bg-lagoon/10 text-lagoon ring-1 ring-lagoon"
                    : "bg-mist text-stone-700"
                } ${!isPlanner ? "cursor-default opacity-80" : ""}`}
              >
                <span className="block">
                  {formatDate(window.startDate)} to {formatDate(window.endDate)} · {window.coverage} people available
                </span>
                <span className="mt-1 block text-xs uppercase tracking-[0.2em]">
                  {finalDateOptions.some((option) => option.id === window.id)
                    ? "Included in final vote"
                    : isPlanner
                      ? "Click to include in final vote"
                      : "Planner chooses final vote windows"}
                </span>
              </button>
            ))
          )}
        </div>
        <p className="mt-4 text-xs uppercase tracking-[0.25em] text-stone-500">
          Trip window: {formatDate(trip.tentativeStart)} to {formatDate(trip.tentativeEnd)}
        </p>
      </Panel>
      <Panel className="p-6">
        <p className="text-sm font-semibold text-ink">Responses</p>
        <div className="mt-4 space-y-4">
          {availabilityByMember.map(({ member, ranges }) => (
            <div key={member.id} className="rounded-[1.6rem] border border-ink/8 bg-white/75 p-4">
              <p className="text-base font-semibold text-ink">{member.profile?.displayName}</p>
              <div className="mt-3 space-y-2">
                {ranges.length === 0 ? (
                  <p className="text-sm text-stone-500">No dates shared yet.</p>
                ) : (
                  ranges.map((range) => (
                    <div key={range.id} className="flex items-center justify-between gap-3 rounded-2xl bg-mist px-3 py-2 text-sm">
                      <span>
                        {formatDate(range.startDate)} to {formatDate(range.endDate)}
                      </span>
                      {member.profileId === currentProfileId ? (
                        <button
                          className="font-semibold text-coral"
                          onClick={() => void onRemoveAvailability(range.id)}
                          type="button"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
