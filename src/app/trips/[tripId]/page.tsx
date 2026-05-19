"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { SkeletonHero, SkeletonDestinationCard } from "@/components/skeleton";
import { useToast } from "@/components/toast";
import { Button, Panel } from "@/components/ui";
import { useAppState } from "@/context/app-state";
import type {
  DestinationCatalogItem,
  RecommendedDestination,
  TripStatus
} from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { DestinationRecommendationsResponse } from "./_components/utils";
import { TripHero } from "./_components/trip-hero";
import { CollectingMembersStage } from "./_components/collecting-members-stage";
import { PlanningStage } from "./_components/planning-stage";
import { VotingStage } from "./_components/voting-stage";
import { DecidedStage } from "./_components/decided-stage";

export default function TripWorkspacePage() {
  const params = useParams<{ tripId: string }>();
  const router = useRouter();
  const {
    currentProfile,
    isPending,
    getTripById,
    getTripMembers,
    getTripInvites,
    getInviteStatus,
    getTripAvailability,
    getSuggestedProfileAvailability,
    getTripDestinations,
    getDateWindowOptions,
    getFinalDateOptions,
    getVoteForCurrentUser,
    getVotesForTrip,
    setFinalDateOptions,
    lockTripDecision,
    reopenTripDecision,
    createInviteLink,
    revokeInvite,
    removeTripMember,
    leaveTrip,
    deleteTrip,
    updateTrip,
    addAvailability,
    removeAvailability,
    addDestinationToTrip,
    toggleDestinationShortlist,
    submitVote,
    updateTripStatus
  } = useAppState();

  const { toast } = useToast();

  const trip = getTripById(params.tripId);
  const members = getTripMembers(params.tripId);
  const invites = getTripInvites(params.tripId);
  const availability = getTripAvailability(params.tripId);
  const suggestedAvailability = getSuggestedProfileAvailability(params.tripId);
  const tripDestinations = getTripDestinations(params.tripId);
  const dateOptions = getDateWindowOptions(params.tripId);
  const finalDateOptions = getFinalDateOptions(params.tripId);
  const destinationVote = getVoteForCurrentUser(params.tripId, "destination");
  const dateVote = getVoteForCurrentUser(params.tripId, "date_window");
  const destinationVotes = getVotesForTrip(params.tripId, "destination");
  const dateVotes = getVotesForTrip(params.tripId, "date_window");
  const isPlanner = trip?.creatorProfileId === currentProfile?.id;

  const shortlist = tripDestinations.filter((entry) => entry.shortlist);
  const canOpenVoting = shortlist.length > 0 && finalDateOptions.length > 0;

  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [rangeStart, setRangeStart] = useState(trip?.tentativeStart ?? "");
  const [rangeEnd, setRangeEnd] = useState(trip?.tentativeEnd ?? "");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [destinationResults, setDestinationResults] = useState<DestinationCatalogItem[]>([]);
  const [isSearchingDestinations, setIsSearchingDestinations] = useState(false);
  const [destinationSearchMessage, setDestinationSearchMessage] = useState("");
  const [selectedDestination, setSelectedDestination] = useState<DestinationCatalogItem | null>(null);
  const [destinationNote, setDestinationNote] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditWindow, setShowEditWindow] = useState(false);
  const [editStart, setEditStart] = useState(trip?.tentativeStart ?? "");
  const [editEnd, setEditEnd] = useState(trip?.tentativeEnd ?? "");
  const [editDuration, setEditDuration] = useState(String(trip?.tripDuration ?? 7));
  const [recommendedDestinations, setRecommendedDestinations] = useState<RecommendedDestination[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  useEffect(() => {
    if (!currentProfile) {
      return;
    }

    const query = destinationQuery.trim();
    if (query.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setIsSearchingDestinations(true);
        setDestinationSearchMessage("");

        const response = await fetch(`/api/destinations/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("Destination search failed");
        }

        const payload = (await response.json()) as { results?: DestinationCatalogItem[] };
        const results = payload.results ?? [];

        setDestinationResults(results);
        setSelectedDestination((current) => {
          if (current && results.some((item) => item.id === current.id)) {
            return current;
          }
          return results[0] ?? null;
        });
        setDestinationSearchMessage(results.length === 0 ? "No matching cities found." : "");
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setDestinationResults([]);
        setSelectedDestination(null);
        setDestinationSearchMessage("We couldn't load destination suggestions right now.");
      } finally {
        setIsSearchingDestinations(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [currentProfile, destinationQuery]);

  useEffect(() => {
    if (!currentProfile || trip?.status !== "planning") {
      return;
    }

    const controller = new AbortController();

    void (async () => {
      try {
        setIsLoadingRecommendations(true);

        const response = await fetch(
          `/api/destinations/recommendations?tripId=${encodeURIComponent(params.tripId)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Recommendations failed");
        }

        const payload = (await response.json()) as DestinationRecommendationsResponse;
        const nextRecommendations = payload.recommendations ?? [];

        setRecommendedDestinations(nextRecommendations);
        setShowRecommendations(nextRecommendations.length > 0);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setRecommendedDestinations([]);
        setShowRecommendations(false);
      } finally {
        setIsLoadingRecommendations(false);
      }
    })();

    return () => controller.abort();
  }, [currentProfile, params.tripId, trip?.status, tripDestinations.length]);

  const availabilityByMember = useMemo(() => {
    return members.map((member) => ({
      member,
      ranges: availability.filter((range) => range.profileId === member.profileId)
    }));
  }, [availability, members]);
  const effectiveDestinationResults =
    destinationQuery.trim().length < 2 ? [] : destinationResults;
  const effectiveSelectedDestination =
    destinationQuery.trim().length < 2 ? null : selectedDestination;
  const effectiveDestinationSearchMessage =
    destinationQuery.trim().length < 2
      ? "Start typing a city to search worldwide destinations."
      : destinationSearchMessage;

  if (!trip && isPending) {
    return (
      <RequireAuth>
        <AppShell>
          <div className="space-y-6">
            <SkeletonHero />
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <SkeletonDestinationCard />
              <SkeletonDestinationCard />
              <SkeletonDestinationCard />
            </div>
          </div>
        </AppShell>
      </RequireAuth>
    );
  }

  if (!trip) {
    return (
      <RequireAuth>
        <AppShell>
          <Panel className="p-10 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-coral">Trip not found</p>
            <p className="section-title mt-4 text-4xl">We couldn&apos;t find this trip.</p>
            <Button href="/dashboard" className="mt-6">
              Back to dashboard
            </Button>
          </Panel>
        </AppShell>
      </RequireAuth>
    );
  }

  const activeTrip = trip;

  async function handleDeleteTrip(tripId: string) {
    await deleteTrip(tripId);
    toast("Trip deleted");
    router.push("/dashboard");
  }

  async function handleLeaveTrip(tripId: string) {
    await leaveTrip(tripId);
    toast("You left the trip");
    router.push("/dashboard");
  }

  async function handleGenerateLink() {
    if (!isPlanner) {
      return;
    }

    const invite = await createInviteLink(activeTrip.id);
    setGeneratedLink(`${window.location.origin}/invite/${invite.token}`);
    toast("Invite link generated");
  }

  async function handleAvailabilitySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await addAvailability(activeTrip.id, rangeStart, rangeEnd);
    toast("Dates saved");
  }

  function handleUseSuggestedAvailability(startDate: string, endDate: string) {
    void addAvailability(activeTrip.id, startDate, endDate).then(() =>
      toast("Suggested dates added")
    );
  }

  async function handleDestinationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentProfile || !effectiveSelectedDestination) {
      return;
    }
    await addDestinationToTrip(activeTrip.id, effectiveSelectedDestination, destinationNote);
    toast(`Added ${effectiveSelectedDestination.city} to trip`);
    setDestinationNote("");
    setDestinationQuery("");
    setDestinationResults([]);
    setSelectedDestination(null);
  }

  async function handleRecommendedDestinationAdd(destination: DestinationCatalogItem) {
    await addDestinationToTrip(activeTrip.id, destination, "Suggested for this group's trip window.");
    toast(`Added ${destination.city} to trip`);
  }

  function handleToggleFinalDateOption(optionId: string) {
    const next = finalDateOptions.some((option) => option.id === optionId)
      ? finalDateOptions.filter((option) => option.id !== optionId).map((option) => option.id)
      : [...finalDateOptions.map((option) => option.id), optionId];
    void setFinalDateOptions(activeTrip.id, next);
  }

  return (
    <RequireAuth>
      <AppShell>
        <div className="space-y-6">
          <SectionErrorBoundary key={`hero-${activeTrip.id}`} fallbackTitle="Could not load trip header">
          <TripHero
            trip={activeTrip}
            isPlanner={isPlanner}
            onStatusChange={async (tripId: string, status: TripStatus) => {
              await updateTripStatus(tripId, status);
            }}
            onLeaveTrip={handleLeaveTrip}
            onDeleteTrip={handleDeleteTrip}
            onUpdateTrip={updateTrip}
            canOpenVoting={canOpenVoting}
            showDeleteConfirm={showDeleteConfirm}
            setShowDeleteConfirm={setShowDeleteConfirm}
            showEditWindow={showEditWindow}
            setShowEditWindow={setShowEditWindow}
            editStart={editStart}
            setEditStart={setEditStart}
            editEnd={editEnd}
            setEditEnd={setEditEnd}
            editDuration={editDuration}
            setEditDuration={setEditDuration}
          />
          </SectionErrorBoundary>

          {activeTrip.status === "collecting_members" ? (
            <SectionErrorBoundary key={`collect-${activeTrip.id}`} fallbackTitle="Could not load members section">
            <CollectingMembersStage
              trip={activeTrip}
              members={members}
              invites={invites}
              getInviteStatus={getInviteStatus}
              generatedLink={generatedLink}
              copied={copied}
              setCopied={setCopied}
              onGenerateLink={handleGenerateLink}
              onRevokeInvite={async (inviteId: string) => {
                await revokeInvite(inviteId);
                toast("Invite revoked");
              }}
              onRemoveMember={async (tripId: string, memberId: string) => {
                await removeTripMember(tripId, memberId);
                toast("Member removed");
              }}
              onAdvanceToPlanning={async (tripId: string, status: TripStatus) => {
                await updateTripStatus(tripId, status);
              }}
              isPlanner={isPlanner}
            />
            </SectionErrorBoundary>
          ) : null}

          {activeTrip.status === "planning" ? (
            <SectionErrorBoundary key={`plan-${activeTrip.id}`} fallbackTitle="Could not load planning section">
            <PlanningStage
              trip={activeTrip}
              currentProfileId={currentProfile?.id}
              members={members}
              availabilityByMember={availabilityByMember}
              suggestedAvailability={suggestedAvailability}
              dateOptions={dateOptions}
              finalDateOptions={finalDateOptions}
              rangeStart={rangeStart}
              setRangeStart={setRangeStart}
              rangeEnd={rangeEnd}
              setRangeEnd={setRangeEnd}
              onSubmitAvailability={handleAvailabilitySubmit}
              onUseSuggestedAvailability={handleUseSuggestedAvailability}
              onRemoveAvailability={async (rangeId: string) => {
                await removeAvailability(rangeId);
                toast("Date range removed");
              }}
              onToggleFinalDateOption={handleToggleFinalDateOption}
              tripDestinations={tripDestinations}
              destinationQuery={destinationQuery}
              setDestinationQuery={setDestinationQuery}
              destinationResults={effectiveDestinationResults}
              isSearchingDestinations={isSearchingDestinations}
              destinationSearchMessage={effectiveDestinationSearchMessage}
              selectedDestination={effectiveSelectedDestination}
              onSelectDestination={setSelectedDestination}
              destinationNote={destinationNote}
              setDestinationNote={setDestinationNote}
              onSubmitDestination={handleDestinationSubmit}
              recommendedDestinations={recommendedDestinations}
              showRecommendations={showRecommendations}
              isLoadingRecommendations={isLoadingRecommendations}
              onAddRecommendedDestination={handleRecommendedDestinationAdd}
              onToggleShortlist={async (tdId: string) => {
                await toggleDestinationShortlist(tdId);
                toast("Shortlist updated");
              }}
              isPlanner={isPlanner}
              canOpenVoting={canOpenVoting}
              onOpenVoting={async () => {
                await updateTripStatus(activeTrip.id, "voting");
              }}
            />
            </SectionErrorBoundary>
          ) : null}

          {activeTrip.status === "voting" ? (
            <SectionErrorBoundary key={`vote-${activeTrip.id}`} fallbackTitle="Could not load voting section">
            <VotingStage
              trip={activeTrip}
              members={members}
              shortlist={shortlist}
              dateOptions={finalDateOptions}
              destinationVote={destinationVote?.optionId}
              dateVote={dateVote?.optionId}
              destinationVotes={destinationVotes}
              dateVotes={dateVotes}
              onVote={async (tripId: string, type: "destination" | "date_window", optionId: string) => {
                await submitVote(tripId, type, optionId);
                toast("Vote recorded");
              }}
              isPlanner={isPlanner}
              onLockDecision={async (...args: Parameters<typeof lockTripDecision>) => {
                await lockTripDecision(...args);
                toast("Decision locked!");
              }}
              lastLockedDestinationLabel={
                activeTrip.finalDestinationSnapshot
                  ? `${activeTrip.finalDestinationSnapshot.city}, ${activeTrip.finalDestinationSnapshot.country}`
                  : undefined
              }
              lastLockedDateLabel={
                activeTrip.finalDateStart && activeTrip.finalDateEnd
                  ? `${formatDate(activeTrip.finalDateStart)} to ${formatDate(activeTrip.finalDateEnd)}`
                  : undefined
              }
            />
            </SectionErrorBoundary>
          ) : null}

          {activeTrip.status === "decided" ? (
            <SectionErrorBoundary key={`decided-${activeTrip.id}`} fallbackTitle="Could not load decision">
            <DecidedStage
              trip={activeTrip}
              members={members}
              onReopenDecision={async (tripId: string) => {
                await reopenTripDecision(tripId);
                toast("Decision reopened — back to voting");
              }}
              isPlanner={isPlanner}
            />
            </SectionErrorBoundary>
          ) : null}
        </div>
      </AppShell>
    </RequireAuth>
  );
}
