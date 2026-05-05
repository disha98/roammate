"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { Button, Input, Panel, StatusBadge, Textarea } from "@/components/ui";
import { WeatherSummary } from "@/components/weather-summary";
import { VisaRequirement } from "@/components/visa-requirement";
import { useAppState } from "@/context/app-state";
import type { DateWindowOption, DestinationCatalogItem, TripStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const statusFlow: TripStatus[] = ["collecting_members", "planning", "voting", "decided"];

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

  useEffect(() => {
    if (!currentProfile) {
      return;
    }

    const query = destinationQuery.trim();
    if (query.length < 2) {
      setDestinationResults([]);
      setSelectedDestination(null);
      setDestinationSearchMessage("Start typing a city to search worldwide destinations.");
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
        setDestinationSearchMessage("We couldn’t load destination suggestions right now.");
      } finally {
        setIsSearchingDestinations(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [currentProfile, destinationQuery]);

  const availabilityByMember = useMemo(() => {
    return members.map((member) => ({
      member,
      ranges: availability.filter((range) => range.profileId === member.profileId)
    }));
  }, [availability, members]);

  if (!trip && isPending) {
    return (
      <RequireAuth>
        <AppShell>
          <Panel className="p-10 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Loading trip</p>
            <p className="section-title mt-4 text-4xl">Opening your planning workspace…</p>
          </Panel>
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
            <p className="section-title mt-4 text-4xl">We couldn’t find this trip.</p>
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
    router.push("/dashboard");
  }

  async function handleLeaveTrip(tripId: string) {
    await leaveTrip(tripId);
    router.push("/dashboard");
  }

  async function handleGenerateLink() {
    if (!isPlanner) {
      return;
    }

    const invite = await createInviteLink(activeTrip.id);
    setGeneratedLink(`${window.location.origin}/invite/${invite.token}`);
  }

  async function handleAvailabilitySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await addAvailability(activeTrip.id, rangeStart, rangeEnd);
  }

  function handleUseSuggestedAvailability(startDate: string, endDate: string) {
    void addAvailability(activeTrip.id, startDate, endDate);
  }

  async function handleDestinationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentProfile || !selectedDestination) {
      return;
    }
    await addDestinationToTrip(activeTrip.id, selectedDestination, destinationNote);
    setDestinationNote("");
    setDestinationQuery("");
    setDestinationResults([]);
    setSelectedDestination(null);
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
          <TripHero
            trip={activeTrip}
            isPlanner={isPlanner}
            onStatusChange={updateTripStatus}
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

          {activeTrip.status === "collecting_members" ? (
            <CollectingMembersStage
              trip={activeTrip}
              members={members}
              invites={invites}
              getInviteStatus={getInviteStatus}
              generatedLink={generatedLink}
              copied={copied}
              setCopied={setCopied}
              onGenerateLink={handleGenerateLink}
              onRevokeInvite={revokeInvite}
              onRemoveMember={removeTripMember}
              onAdvanceToPlanning={updateTripStatus}
              isPlanner={isPlanner}
            />
          ) : null}

          {activeTrip.status === "planning" ? (
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
              onRemoveAvailability={removeAvailability}
              onToggleFinalDateOption={handleToggleFinalDateOption}
              tripDestinations={tripDestinations}
              destinationQuery={destinationQuery}
              setDestinationQuery={setDestinationQuery}
              destinationResults={destinationResults}
              isSearchingDestinations={isSearchingDestinations}
              destinationSearchMessage={destinationSearchMessage}
              selectedDestination={selectedDestination}
              onSelectDestination={setSelectedDestination}
              destinationNote={destinationNote}
              setDestinationNote={setDestinationNote}
              onSubmitDestination={handleDestinationSubmit}
              onToggleShortlist={toggleDestinationShortlist}
              isPlanner={isPlanner}
              canOpenVoting={canOpenVoting}
              onOpenVoting={() => void updateTripStatus(activeTrip.id, "voting")}
            />
          ) : null}

          {activeTrip.status === "voting" ? (
            <VotingStage
              trip={activeTrip}
              members={members}
              shortlist={shortlist}
              dateOptions={finalDateOptions}
              destinationVote={destinationVote?.optionId}
              dateVote={dateVote?.optionId}
              destinationVotes={destinationVotes}
              dateVotes={dateVotes}
              onVote={submitVote}
            />
          ) : null}

          {activeTrip.status === "decided" ? (
            <DecidedStage
              trip={activeTrip}
              members={members}
              shortlist={shortlist}
              dateOptions={finalDateOptions}
              destinationVotes={destinationVotes}
              dateVotes={dateVotes}
            />
          ) : null}
        </div>
      </AppShell>
    </RequireAuth>
  );
}

function TripHero({
  trip,
  isPlanner,
  onStatusChange,
  onLeaveTrip,
  onDeleteTrip,
  onUpdateTrip,
  canOpenVoting,
  showDeleteConfirm,
  setShowDeleteConfirm,
  showEditWindow,
  setShowEditWindow,
  editStart,
  setEditStart,
  editEnd,
  setEditEnd,
  editDuration,
  setEditDuration
}: {
  trip: NonNullable<ReturnType<ReturnType<typeof useAppState>["getTripById"]>>;
  isPlanner: boolean;
  onStatusChange: (tripId: string, status: TripStatus) => Promise<void>;
  onLeaveTrip: (tripId: string) => Promise<void>;
  onDeleteTrip: (tripId: string) => Promise<void>;
  onUpdateTrip: (tripId: string, input: { tentativeStart: string; tentativeEnd: string; tripDuration: number }) => Promise<void>;
  canOpenVoting: boolean;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (value: boolean) => void;
  showEditWindow: boolean;
  setShowEditWindow: (value: boolean) => void;
  editStart: string;
  setEditStart: (value: string) => void;
  editEnd: string;
  setEditEnd: (value: string) => void;
  editDuration: string;
  setEditDuration: (value: string) => void;
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="grid gap-6 p-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/dashboard" className="text-sm font-semibold text-lagoon">
              Back to dashboard
            </Link>
            <StatusBadge status={trip.status} />
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-700">
              {trip.groupName}
            </span>
          </div>
          <h1 className="section-title mt-4 text-5xl text-ink">{trip.title}</h1>
          <p className="mt-4 max-w-4xl text-sm text-stone-600">{trip.summary}</p>
          <div className="mt-5">
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
              Target window: {formatDate(trip.tentativeStart)} to {formatDate(trip.tentativeEnd)} · {trip.tripDuration} day trip
            </p>
            {isPlanner ? (
              showEditWindow ? (
                <div className="mt-3 rounded-[1.5rem] border border-ink/8 bg-white/80 p-4">
                  <p className="text-sm font-semibold text-ink">Edit trip window</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-xs text-stone-500" htmlFor="edit-start">Window opens</label>
                      <Input id="edit-start" type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-stone-500" htmlFor="edit-end">Window closes</label>
                      <Input id="edit-end" type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-stone-500" htmlFor="edit-duration">Trip length (days)</label>
                      <Input id="edit-duration" type="number" min={1} value={editDuration} onChange={(e) => setEditDuration(e.target.value)} />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      onClick={() => {
                        void onUpdateTrip(trip.id, {
                          tentativeStart: editStart,
                          tentativeEnd: editEnd,
                          tripDuration: Number(editDuration) || 7
                        });
                        setShowEditWindow(false);
                      }}
                    >
                      Save
                    </Button>
                    <Button variant="secondary" onClick={() => setShowEditWindow(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-lagoon underline underline-offset-2"
                  onClick={() => {
                    setEditStart(trip.tentativeStart);
                    setEditEnd(trip.tentativeEnd);
                    setEditDuration(String(trip.tripDuration));
                    setShowEditWindow(true);
                  }}
                >
                  Edit window
                </button>
              )
            ) : null}
          </div>
        </div>
        <div className="rounded-[2rem] bg-ink p-5 text-white">
          <p className="text-sm uppercase tracking-[0.35em] text-sun">Trip stage</p>
          <p className="mt-3 text-sm text-stone-200">
            {stageCopy[trip.status]}
          </p>
          {isPlanner ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {statusFlow.map((status) => (
                <Button
                  key={status}
                  variant={trip.status === status ? "primary" : "secondary"}
                  disabled={status === "voting" && !canOpenVoting}
                  className={
                    trip.status === status
                      ? "bg-white text-ink hover:bg-white"
                      : "border-white/10 bg-white/10 text-white hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  }
                  onClick={() => void onStatusChange(trip.id, status)}
                >
                  {statusLabel(status)}
                </Button>
              ))}
            </div>
            
            
          ) : (
            <div className="mt-4">
              <p className="text-sm text-stone-300">
                The planner controls when this trip moves into the next stage.
              </p>
              <Button
                variant="secondary"
                className="mt-3 border-coral/30 bg-coral/10 text-coral hover:border-coral/50 hover:text-coral"
                onClick={() => void onLeaveTrip(trip.id)}
              >
                Leave trip
              </Button>
            </div>
          )}
          {isPlanner && !canOpenVoting && trip.status === "planning" ? (
            <p className="mt-4 text-sm text-stone-300">
              Choose at least one shortlisted destination and one final date window before voting opens.
            </p>
          ) : null}
          {isPlanner ? (
            <div className="mt-4">
              {showDeleteConfirm ? (
                <div className="rounded-2xl bg-coral/10 p-3">
                  <p className="text-sm text-coral">Delete this trip permanently? This cannot be undone.</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-coral px-3 py-1 text-xs font-semibold text-white"
                      onClick={() => void onDeleteTrip(trip.id)}
                    >
                      Yes, delete
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-stone-300"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="text-xs font-medium text-stone-400 underline underline-offset-2 hover:text-coral"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete trip
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

function CollectingMembersStage({
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
        <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Who’s in</p>
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
                    {invite.type === "email" ? `Invited ${invite.email}` : "Share link"} ·{" "}
                    {inviteStatusLabel(getInviteStatus(invite))}
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

function PlanningStage({
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

function DestinationBoard({
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
  onToggleShortlist: (tripDestinationId: string) => void;
  isPlanner: boolean;
}) {
  return (
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

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {tripDestinations.map((entry) => {
          if (!entry.destination) {
            return null;
          }

          const destination = entry.destination;

          return (
            <article key={entry.id} className="overflow-hidden rounded-[2rem] border border-ink/8 bg-white/80">
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
                    <p className="mt-2 text-sm text-stone-600">{destination.summary}</p>
                  </div>
                  {isPlanner ? (
                    <button
                      className={`rounded-full px-3 py-2 text-xs font-semibold ${entry.shortlist ? "bg-lagoon text-white" : "bg-mist text-stone-700"}`}
                      onClick={() => void onToggleShortlist(entry.id)}
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
                  {destination.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-sun/20 px-3 py-1 text-xs font-semibold text-amber-900">
                      {tag}
                    </span>
                  ))}
                </div>
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
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

function VotingStage({
  trip,
  members,
  shortlist,
  dateOptions,
  destinationVote,
  dateVote,
  destinationVotes,
  dateVotes,
  onVote
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
}) {
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
      </Panel>
      <Panel className="p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <VoteCard
            title="Destination vote"
            empty="The planner needs to shortlist destinations before voting opens."
            options={shortlist
              .filter((entry) => entry.destination)
              .map((entry) => ({
                id: entry.destinationId,
                label: `${entry.destination?.city}, ${entry.destination?.country}`,
                votes: destinationVotes.filter((vote) => vote.optionId === entry.destinationId).length
              }))}
            selectedId={destinationVote}
            onSelect={(optionId) => void onVote(trip.id, "destination", optionId)}
          />
          <VoteCard
            title="Date vote"
            empty="Date voting will open once good overlap windows are available."
            options={dateOptions.map((option) => ({
              id: option.id,
              label: `${formatDate(option.startDate)} to ${formatDate(option.endDate)}`,
              votes: dateVotes.filter((vote) => vote.optionId === option.id).length
            }))}
            selectedId={dateVote}
            onSelect={(optionId) => void onVote(trip.id, "date_window", optionId)}
          />
        </div>
      </Panel>
    </div>
  );
}

function DecidedStage({
  trip,
  members,
  shortlist,
  dateOptions,
  destinationVotes,
  dateVotes
}: {
  trip: NonNullable<ReturnType<ReturnType<typeof useAppState>["getTripById"]>>;
  members: ReturnType<ReturnType<typeof useAppState>["getTripMembers"]>;
  shortlist: ReturnType<ReturnType<typeof useAppState>["getTripDestinations"]>;
  dateOptions: DateWindowOption[];
  destinationVotes: ReturnType<ReturnType<typeof useAppState>["getVotesForTrip"]>;
  dateVotes: ReturnType<ReturnType<typeof useAppState>["getVotesForTrip"]>;
}) {
  const winningDestination = getWinningDestination(shortlist, destinationVotes);
  const winningDates = getWinningDateWindow(dateOptions, dateVotes);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <Panel className="p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Decision</p>
        <h2 className="section-title mt-2 text-3xl">The trip has a direction.</h2>
        <div className="mt-5 space-y-4">
          <div className="rounded-[1.8rem] bg-mist p-4">
            <p className="text-sm font-semibold text-ink">Chosen destination</p>
            <p className="mt-2 text-lg text-stone-700">
              {winningDestination
                ? `${winningDestination.destination?.city}, ${winningDestination.destination?.country}`
                : "No destination chosen yet"}
            </p>
          </div>
          <div className="rounded-[1.8rem] bg-mist p-4">
            <p className="text-sm font-semibold text-ink">Chosen dates</p>
            <p className="mt-2 text-lg text-stone-700">
              {winningDates
                ? `${formatDate(winningDates.startDate)} to ${formatDate(winningDates.endDate)}`
                : `Target window remains ${formatDate(trip.tentativeStart)} to ${formatDate(trip.tentativeEnd)}`}
            </p>
          </div>
        </div>
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

function getWinningDestination(
  shortlist: ReturnType<ReturnType<typeof useAppState>["getTripDestinations"]>,
  votes: ReturnType<ReturnType<typeof useAppState>["getVotesForTrip"]>
) {
  return shortlist.reduce<
    | (ReturnType<ReturnType<typeof useAppState>["getTripDestinations"]>[number] & { totalVotes: number })
    | null
  >((winner, entry) => {
    const totalVotes = votes.filter((vote) => vote.optionId === entry.destinationId).length;
    if (!winner || totalVotes > winner.totalVotes) {
      return { ...entry, totalVotes };
    }
    return winner;
  }, null);
}

function getWinningDateWindow(
  options: DateWindowOption[],
  votes: ReturnType<ReturnType<typeof useAppState>["getVotesForTrip"]>
) {
  return options.reduce<(DateWindowOption & { totalVotes: number }) | null>((winner, option) => {
    const totalVotes = votes.filter((vote) => vote.optionId === option.id).length;
    if (!winner || totalVotes > winner.totalVotes) {
      return { ...option, totalVotes };
    }
    return winner;
  }, null);
}

function statusLabel(status: TripStatus) {
  return status.replaceAll("_", " ");
}

function inviteStatusLabel(status: "pending" | "accepted" | "expired" | "revoked") {
  return {
    pending: "Pending",
    accepted: "Joined",
    expired: "Expired",
    revoked: "Revoked"
  }[status];
}

const stageCopy: Record<TripStatus, string> = {
  draft: "This trip is still being outlined.",
  collecting_members: "Invite everyone who should help shape the trip.",
  planning: "Collect dates, compare destinations, and narrow the shortlist.",
  voting: "Finalists are in place. Time for the group to choose.",
  decided: "The destination and dates are locked in."
};
