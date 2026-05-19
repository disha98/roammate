"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { Button, Input, Panel, Textarea } from "@/components/ui";
import { WeatherSummary } from "@/components/weather-summary";
import { VisaRequirement } from "@/components/visa-requirement";
import { useAppState } from "@/context/app-state";
import type {
  DestinationCatalogItem,
  RecommendedDestination
} from "@/lib/types";
import {
  DestinationDetailsResponse,
  hasReliableDestinationIntelligence,
  CostPill,
  formatUsd,
  budgetTierLabel
} from "./utils";

export function DestinationBoard({
  trip,
  members,
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
  isPlanner
}: {
  trip: NonNullable<ReturnType<ReturnType<typeof useAppState>["getTripById"]>>;
  members: ReturnType<ReturnType<typeof useAppState>["getTripMembers"]>;
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
}) {
  const [activeDestinationId, setActiveDestinationId] = useState<string | null>(null);
  const [destinationDetailsById, setDestinationDetailsById] = useState<Record<string, DestinationDetailsResponse>>({});
  const [loadingDestinationId, setLoadingDestinationId] = useState<string | null>(null);
  const [destinationDetailsError, setDestinationDetailsError] = useState("");

  const activeEntry = activeDestinationId
    ? tripDestinations.find((entry) => entry.destinationId === activeDestinationId)
    : undefined;
  const activeDetails = activeDestinationId ? destinationDetailsById[activeDestinationId] : undefined;
  const activeDestination = activeEntry?.destination;

  async function openDestinationDetails(destinationId: string) {
    setActiveDestinationId(destinationId);
    setDestinationDetailsError("");

    if (destinationDetailsById[destinationId]) {
      return;
    }

    setLoadingDestinationId(destinationId);
    try {
      const response = await fetch(
        `/api/destinations/enrichment?destinationId=${encodeURIComponent(destinationId)}&tripId=${encodeURIComponent(trip.id)}`
      );
      if (!response.ok) {
        throw new Error("Destination enrichment failed");
      }

      const payload = (await response.json()) as DestinationDetailsResponse;
      setDestinationDetailsById((current) => ({
        ...current,
        [destinationId]: payload
      }));
    } catch {
      setDestinationDetailsError("We couldn't load the deeper destination breakdown right now.");
    } finally {
      setLoadingDestinationId(null);
    }
  }

  return (
    <>
      <Panel className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Destinations</p>
            <h2 className="section-title mt-2 text-3xl">Compare places side by side.</h2>
            <p className="mt-2 text-sm text-stone-600">
              Add destinations, read the vibe, check visas, and move the strongest options into the
              shortlist.
            </p>
          </div>
        </div>

        <form className="mt-5 grid gap-3 rounded-[1.8rem] bg-mist p-4 lg:grid-cols-[1fr_1.2fr_auto]" onSubmit={onSubmitDestination}>
          <div className="lg:col-span-3">
            <p className="text-sm text-stone-700">
              Everyone in the trip can suggest destination options during planning. The planner still
              decides which ones move onto the final shortlist.
            </p>
          </div>
          <div className="space-y-2">
            <Input
              value={destinationQuery}
              onChange={(event) => setDestinationQuery(event.target.value)}
              placeholder="Search a city worldwide"
            />
            <div className="min-h-5 text-xs text-stone-500">
              {isSearchingDestinations
                ? "Searching major cities..."
                : destinationSearchMessage}
            </div>
            {destinationResults.length > 0 ? (
              <div className="max-h-72 space-y-2 overflow-auto rounded-[1.5rem] border border-ink/8 bg-white/90 p-2">
                {destinationResults.map((destination) => {
                  const isSelected = selectedDestination?.id === destination.id;

                  return (
                    <button
                      key={destination.id}
                      className={`flex w-full items-start justify-between gap-3 rounded-[1.2rem] px-3 py-3 text-left transition ${
                        isSelected ? "bg-lagoon/10 ring-1 ring-lagoon" : "hover:bg-mist"
                      }`}
                      onClick={() => onSelectDestination(destination)}
                      type="button"
                    >
                      <div>
                        <p className="font-semibold text-ink">
                          {destination.city}
                          {destination.region ? `, ${destination.region}` : ""}, {destination.country}
                        </p>
                        <p className="text-sm text-stone-600">
                          {destination.population ? `Population ${destination.population.toLocaleString()}` : "Major city"}
                        </p>
                      </div>
                      <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-stone-700">
                        {destination.countryCode}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          <Textarea
            rows={1}
            value={destinationNote}
            onChange={(event) => setDestinationNote(event.target.value)}
            placeholder="Why does this place fit the trip?"
          />
          <Button type="submit" disabled={!selectedDestination}>
            Add option
          </Button>
        </form>

        {showRecommendations || isLoadingRecommendations ? (
          <div className="mt-6 rounded-[1.8rem] border border-ink/8 bg-white/75 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-lagoon">Suggested next</p>
                <p className="mt-2 text-sm text-stone-600">
                  A small set of city ideas generated for this trip window, with weather fit first
                  and visa friction checked against the saved group profiles.
                </p>
              </div>
            </div>
            {isLoadingRecommendations ? (
              <p className="mt-4 text-sm text-stone-500">Looking for a few strong-fit cities…</p>
            ) : (
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {recommendedDestinations.map((recommendation) => (
                  <div
                    key={recommendation.destination.id}
                    className="rounded-[1.5rem] border border-ink/8 bg-mist/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-ink">
                          {recommendation.destination.city}, {recommendation.destination.country}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500">
                          Weather score {recommendation.weatherScore}/100
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded-full bg-lagoon px-3 py-2 text-xs font-semibold text-white transition hover:bg-lagoon/85"
                        onClick={() => void onAddRecommendedDestination(recommendation.destination)}
                      >
                        Add to trip
                      </button>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-stone-700">
                      {recommendation.reasons.slice(0, 3).map((reason) => (
                        <p key={reason} className="rounded-2xl bg-white px-3 py-2">
                          {reason}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          {tripDestinations.map((entry) => {
            if (!entry.destination) {
              return null;
            }

            const destination = entry.destination;
            const details = destinationDetailsById[entry.destinationId];
            const enrichment = details?.enrichment ?? entry.enrichment;
            const hasReliableDetails = hasReliableDestinationIntelligence(destination, enrichment);
            const cardTags =
              hasReliableDetails && enrichment?.vibeTags?.length ? enrichment.vibeTags : [];
            const cardSummary =
              hasReliableDetails && enrichment?.shortSummary ? enrichment.shortSummary : null;

            return (
              <article
                key={entry.id}
                className="overflow-hidden rounded-[2rem] border border-ink/8 bg-white/80 transition hover:-translate-y-0.5 hover:shadow-panel"
                onClick={() => void openDestinationDetails(entry.destinationId)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    void openDestinationDetails(entry.destinationId);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="relative h-56">
                  <Image
                    src={destination.image}
                    alt={`${destination.city}, ${destination.country}`}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="section-title text-3xl">
                        {destination.city}, {destination.country}
                      </h3>
                      <p className="mt-2 text-sm text-stone-600">
                        {cardSummary ?? <span className="italic text-stone-400">Destination details loading…</span>}
                      </p>
                    </div>
                    {isPlanner ? (
                      <button
                        className={`rounded-full px-3 py-2 text-xs font-semibold ${entry.shortlist ? "bg-lagoon text-white" : "bg-mist text-stone-700"}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          void onToggleShortlist(entry.id);
                        }}
                        type="button"
                      >
                        {entry.shortlist ? "On final shortlist" : "Move to shortlist"}
                      </button>
                    ) : (
                      <span
                        className={`rounded-full px-3 py-2 text-xs font-semibold ${
                          entry.shortlist ? "bg-lagoon text-white" : "bg-mist text-stone-700"
                        }`}
                      >
                        {entry.shortlist ? "On final shortlist" : "Destination option"}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {cardTags.length > 0 ? cardTags.map((tag) => (
                      <span key={tag} className="rounded-full bg-sun/20 px-3 py-1 text-xs font-semibold text-amber-900">
                        {tag}
                      </span>
                    )) : (
                      <span className="text-xs italic text-stone-400">Tags unavailable</span>
                    )}
                  </div>
                  {enrichment ? (
                    <div className="mt-4 rounded-[1.4rem] bg-mist px-4 py-3 text-sm text-stone-700">
                      <p className="font-semibold text-ink">
                        {budgetTierLabel(enrichment.budgetTier)} vibe
                      </p>
                      <p className="mt-1">
                        Around {formatUsd(enrichment.localCosts.dailyTotalUsd)}/day locally before travel.
                      </p>
                    </div>
                  ) : null}
                  <div className="mt-4">
                    <WeatherSummary
                      city={destination.city}
                      lat={destination.lat}
                      lon={destination.lon}
                      startDate={trip.tentativeStart}
                      endDate={trip.tentativeEnd}
                    />
                  </div>
                  <p className="mt-3 text-sm text-stone-600">{entry.note || "No note added yet."}</p>
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {members.map((member) => (
                      <div key={member.id} className="rounded-2xl border border-ink/8 bg-white px-3 py-2 text-sm text-stone-700">
                        <span className="font-semibold">{member.profile?.displayName}</span>:{" "}
                        <VisaRequirement
                          passportCode={member.profile?.passport ?? ""}
                          destinationCode={destination.countryCode}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-sm font-semibold text-lagoon">
                    Click for destination details and per-person cost estimates
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </Panel>

      {activeDestination ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-4 py-8">
          <div className="absolute inset-0" onClick={() => setActiveDestinationId(null)} />
          <Panel className="relative max-h-[90vh] w-full max-w-5xl overflow-auto rounded-[2rem] bg-[#f8f5ef] p-0">
            <div className="relative h-60">
              <Image
                src={activeDestination.image}
                alt={`${activeDestination.city}, ${activeDestination.country}`}
                fill
                className="object-cover"
              />
              <button
                type="button"
                className="absolute right-4 top-4 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-ink"
                onClick={() => setActiveDestinationId(null)}
              >
                Close
              </button>
            </div>
            <div className="grid gap-6 p-6 xl:grid-cols-[0.9fr_1.1fr]">
              {(() => {
                const activeEnrichment = activeDetails?.enrichment ?? activeEntry!.enrichment;
                const hasReliableDetails = hasReliableDestinationIntelligence(activeDestination, activeEnrichment);

                if (!hasReliableDetails) {
                  return (
                    <>
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Destination deep dive</p>
                        <h3 className="section-title mt-2 text-4xl text-ink">
                          {activeDestination.city}, {activeDestination.country}
                        </h3>
                        <div className="mt-5">
                          <WeatherSummary
                            city={activeDestination.city}
                            lat={activeDestination.lat}
                            lon={activeDestination.lon}
                            startDate={trip.tentativeStart}
                            endDate={trip.tentativeEnd}
                          />
                        </div>
                        <div className="mt-5 rounded-[1.6rem] bg-white/85 p-4">
                          <p className="text-sm font-semibold text-ink">Why the group suggested it</p>
                          <p className="mt-2 text-sm text-stone-600">
                            {activeEntry!.note || "No trip-specific note has been added yet."}
                          </p>
                        </div>
                        <div className="mt-5 rounded-[1.6rem] bg-white/85 p-4">
                          <p className="text-sm font-semibold text-ink">Visa snapshot</p>
                          <div className="mt-3 grid gap-2">
                            {members.map((member) => (
                              <div key={member.id} className="rounded-2xl border border-ink/8 bg-mist px-3 py-2 text-sm text-stone-700">
                                <span className="font-semibold">{member.profile?.displayName}</span>:{" "}
                                <VisaRequirement
                                  passportCode={member.profile?.passport ?? ""}
                                  destinationCode={activeDestination.countryCode}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-5">
                        <div className="rounded-[1.6rem] bg-white/85 p-5">
                          <p className="text-sm font-semibold text-ink">City details unavailable right now</p>
                          <p className="mt-2 text-sm text-stone-600">
                            We don&apos;t have reliable city-specific destination intelligence for this place yet, so we&apos;re not showing generic filler.
                          </p>
                          <p className="mt-3 text-sm text-stone-500">
                            You can still use the weather, visa view, and rough cost snapshot below while richer city details are unavailable.
                          </p>
                        </div>
                        <div className="rounded-[1.6rem] bg-white/85 p-4">
                          <p className="text-sm font-semibold text-ink">Cost snapshot</p>
                          <p className="mt-1 text-sm text-stone-500">
                            Rough mid-range estimate for a {activeDetails?.tripDuration ?? trip.tripDuration}-day trip.
                          </p>
                          {destinationDetailsError ? (
                            <p className="mt-3 text-sm text-coral">{destinationDetailsError}</p>
                          ) : null}
                          {activeDetails ? (
                            <>
                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <CostPill label="Lodging / night" value={formatUsd(activeDetails.localCostSummary.lodgingMidUsd)} />
                                <CostPill label="Food / day" value={formatUsd(activeDetails.localCostSummary.foodMidUsd)} />
                                <CostPill label="Local transport / day" value={formatUsd(activeDetails.localCostSummary.localTransportMidUsd)} />
                                <CostPill label="Activities / day" value={formatUsd(activeDetails.localCostSummary.activitiesMidUsd)} />
                              </div>
                              <div className="mt-4 rounded-[1.4rem] bg-mist px-4 py-4">
                                <p className="text-sm font-semibold text-ink">
                                  Local trip total is roughly {formatUsd(activeDetails.localCostSummary.tripTotalUsd)} per traveler before flights.
                                </p>
                                <p className="mt-1 text-xs text-stone-500">
                                  Treat this as directional planning guidance, not a quoted market price.
                                </p>
                              </div>
                            </>
                          ) : (
                            <p className="mt-4 text-sm text-stone-500">
                              We&apos;re loading the destination&apos;s cost breakdown and route estimates.
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  );
                }

                return (
                  <>
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Destination deep dive</p>
                      <h3 className="section-title mt-2 text-4xl text-ink">
                        {activeDestination.city}, {activeDestination.country}
                      </h3>
                      <p className="mt-3 text-sm text-stone-600">
                        {activeDetails?.enrichment.longSummary ??
                          activeEntry!.enrichment?.longSummary ??
                          "Destination summary unavailable."}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(activeDetails?.enrichment.vibeTags ??
                          activeEntry!.enrichment?.vibeTags ??
                          []).map((tag) => (
                          <span key={tag} className="rounded-full bg-sun/20 px-3 py-1 text-xs font-semibold text-amber-900">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="mt-5">
                        <WeatherSummary
                          city={activeDestination.city}
                          lat={activeDestination.lat}
                          lon={activeDestination.lon}
                          startDate={trip.tentativeStart}
                          endDate={trip.tentativeEnd}
                        />
                      </div>
                      <div className="mt-5 rounded-[1.6rem] bg-white/85 p-4">
                        <p className="text-sm font-semibold text-ink">Why the group suggested it</p>
                        <p className="mt-2 text-sm text-stone-600">
                          {activeEntry!.note || "No trip-specific note has been added yet."}
                        </p>
                      </div>
                      <div className="mt-5 rounded-[1.6rem] bg-white/85 p-4">
                        <p className="text-sm font-semibold text-ink">Visa snapshot</p>
                        <div className="mt-3 grid gap-2">
                          {members.map((member) => (
                            <div key={member.id} className="rounded-2xl border border-ink/8 bg-mist px-3 py-2 text-sm text-stone-700">
                              <span className="font-semibold">{member.profile?.displayName}</span>:{" "}
                              <VisaRequirement
                                passportCode={member.profile?.passport ?? ""}
                                destinationCode={activeDestination.countryCode}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-5">
                      <div className="rounded-[1.6rem] bg-white/85 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-ink">What there is to do</p>
                            <p className="mt-1 text-sm text-stone-500">
                              City-specific activity ideas grounded in destination detail.
                            </p>
                          </div>
                          {loadingDestinationId === activeEntry!.destinationId ? (
                            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-lagoon">
                              Loading
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-4 space-y-3">
                          {(activeDetails?.enrichment.topActivities ??
                            activeEntry!.enrichment?.topActivities ??
                            []
                          ).map((activity) => (
                            <div key={activity.title} className="rounded-[1.2rem] bg-mist px-4 py-3">
                              <p className="font-semibold text-ink">{activity.title}</p>
                              <p className="mt-1 text-sm text-stone-600">{activity.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[1.6rem] bg-white/85 p-4">
                        <p className="text-sm font-semibold text-ink">Cost snapshot</p>
                        <p className="mt-1 text-sm text-stone-500">
                          Rough mid-range estimate for a {activeDetails?.tripDuration ?? trip.tripDuration}-day trip.
                        </p>
                        {destinationDetailsError ? (
                          <p className="mt-3 text-sm text-coral">{destinationDetailsError}</p>
                        ) : null}
                        {activeDetails ? (
                          <>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <CostPill label="Lodging / night" value={formatUsd(activeDetails.localCostSummary.lodgingMidUsd)} />
                              <CostPill label="Food / day" value={formatUsd(activeDetails.localCostSummary.foodMidUsd)} />
                              <CostPill label="Local transport / day" value={formatUsd(activeDetails.localCostSummary.localTransportMidUsd)} />
                              <CostPill label="Activities / day" value={formatUsd(activeDetails.localCostSummary.activitiesMidUsd)} />
                            </div>
                            <div className="mt-4 rounded-[1.4rem] bg-mist px-4 py-4">
                              <p className="text-sm font-semibold text-ink">
                                Local trip total is roughly {formatUsd(activeDetails.localCostSummary.tripTotalUsd)} per traveler before flights.
                              </p>
                              <p className="mt-1 text-xs text-stone-500">
                                Treat this as directional planning guidance, not a quoted market price.
                              </p>
                            </div>
                            <div className="mt-4">
                              <p className="text-sm font-semibold text-ink">Per-person route estimate</p>
                              <div className="mt-3 space-y-2">
                                {activeDetails.memberEstimates.map((estimate) => (
                                  <div key={estimate.profileId} className="rounded-[1.2rem] border border-ink/8 bg-mist px-4 py-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <div>
                                        <p className="font-semibold text-ink">{estimate.displayName}</p>
                                        <p className="text-sm text-stone-500">
                                          {estimate.homeCity || "Home city missing"}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-semibold text-ink">
                                          {estimate.totalTripCostUsd !== null
                                            ? formatUsd(estimate.totalTripCostUsd)
                                            : "Estimate unavailable"}
                                        </p>
                                        <p className="text-xs text-stone-500">
                                          {estimate.travelCostUsd !== null
                                            ? `${formatUsd(estimate.travelCostUsd)} travel + ${formatUsd(estimate.localTripCostUsd)} local`
                                            : estimate.note}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="mt-4 text-sm text-stone-500">
                            We&apos;re loading the destination&apos;s cost breakdown and route estimates.
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </Panel>
        </div>
      ) : null}
    </>
  );
}
