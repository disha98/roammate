"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition
} from "react";
import { computeDateWindowOptions } from "@/lib/availability";
import { initialAppState } from "@/lib/demo-data";
import { destinationCatalog } from "@/lib/destinations";
import type {
  AppState,
  AvailabilityRange,
  DateWindowOption,
  DestinationCatalogItem,
  InviteStatus,
  Profile,
  ProfileAvailabilityWindow,
  Trip,
  TripDestination,
  TripInvite,
  TripMember,
  TripStatus,
  Vote,
  VoteType
} from "@/lib/types";
import { createId } from "@/lib/utils";

const STORAGE_KEY = "roammate-app-state-v1";

function normalizeState(candidate: Partial<AppState> | AppState): AppState {
  return {
    profiles: candidate.profiles ?? initialAppState.profiles,
    currentProfileId:
      candidate.currentProfileId === undefined
        ? initialAppState.currentProfileId
        : candidate.currentProfileId,
    trips: (candidate.trips ?? initialAppState.trips).map((trip) => ({
      ...trip,
      finalDateOptionIds: trip.finalDateOptionIds ?? [],
      decidedAt: trip.decidedAt
    })),
    tripMembers: candidate.tripMembers ?? initialAppState.tripMembers,
    tripInvites: candidate.tripInvites ?? initialAppState.tripInvites,
    profileAvailabilityWindows:
      candidate.profileAvailabilityWindows ?? initialAppState.profileAvailabilityWindows,
    availabilityRanges: candidate.availabilityRanges ?? initialAppState.availabilityRanges,
    tripDestinations: candidate.tripDestinations ?? initialAppState.tripDestinations,
    votes: candidate.votes ?? initialAppState.votes
  };
}

function getInviteStatus(invite: TripInvite): InviteStatus {
  if (invite.revokedAt) {
    return "revoked";
  }

  if (invite.type === "email" && invite.acceptedAt) {
    return "accepted";
  }

  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return "expired";
  }

  return "pending";
}

interface CreateTripInput {
  title: string;
  groupName: string;
  summary: string;
  tentativeStart: string;
  tentativeEnd: string;
}

interface LoginInput {
  email: string;
  displayName: string;
  homeCity: string;
  passport: string;
}

interface UpdateProfileInput {
  displayName: string;
  homeCity: string;
  passport: string;
  photoUrl: string;
}

interface AppStateValue {
  state: AppState;
  isReady: boolean;
  isPending: boolean;
  currentProfile: Profile | null;
  login: (input: LoginInput, inviteToken?: string) => string | undefined;
  logout: () => void;
  updateCurrentProfile: (input: UpdateProfileInput) => void;
  addProfileAvailabilityWindow: (input: {
    label: string;
    startMonthDay: string;
    endMonthDay: string;
  }) => void;
  removeProfileAvailabilityWindow: (windowId: string) => void;
  createTrip: (input: CreateTripInput) => string;
  updateTripStatus: (tripId: string, status: TripStatus) => void;
  setFinalDateOptions: (tripId: string, optionIds: string[]) => void;
  createInviteLink: (tripId: string) => TripInvite;
  inviteByEmail: (tripId: string, email: string) => void;
  revokeInvite: (inviteId: string) => void;
  joinTripByInviteToken: (token: string) => string | undefined;
  addAvailability: (tripId: string, startDate: string, endDate: string) => void;
  removeAvailability: (rangeId: string) => void;
  addDestinationToTrip: (tripId: string, destination: DestinationCatalogItem, note: string) => void;
  toggleDestinationShortlist: (tripDestinationId: string) => void;
  submitVote: (tripId: string, type: VoteType, optionId: string) => void;
  getTripById: (tripId: string) => Trip | undefined;
  getTripMembers: (tripId: string) => (TripMember & { profile: Profile | undefined })[];
  getTripInvites: (tripId: string) => TripInvite[];
  getInviteStatus: (invite: TripInvite) => InviteStatus;
  getFinalDateOptions: (tripId: string) => DateWindowOption[];
  getTripDestinations: (tripId: string) => (TripDestination & { destination: typeof destinationCatalog[number] | undefined })[];
  getTripAvailability: (tripId: string) => AvailabilityRange[];
  getProfileAvailabilityWindows: (profileId?: string) => ProfileAvailabilityWindow[];
  getSuggestedProfileAvailability: (
    tripId: string,
    profileId?: string
  ) => { label: string; startDate: string; endDate: string; sourceWindowId: string }[];
  getDateWindowOptions: (tripId: string) => DateWindowOption[];
  getVoteForCurrentUser: (tripId: string, type: VoteType) => Vote | undefined;
  getVotesForTrip: (tripId: string, type: VoteType) => Vote[];
  getVisibleTrips: () => { created: Trip[]; joined: Trip[] };
  getInvitePreview: (token: string) => {
    invite: TripInvite | undefined;
    trip: Trip | undefined;
    planner: Profile | undefined;
    memberCount: number;
  };
}

const AppStateContext = createContext<AppStateValue | null>(null);

function sortTrips(trips: Trip[]) {
  return [...trips].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialAppState);
  const [isReady, setIsReady] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      setState(normalizeState(JSON.parse(raw) as Partial<AppState>));
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
  }, [state, isReady]);

  const currentProfile = state.profiles.find((profile) => profile.id === state.currentProfileId) ?? null;

  const updateState = (updater: (previous: AppState) => AppState) => {
    startTransition(() => {
      setState((previous) => updater(previous));
    });
  };

  const value = useMemo<AppStateValue>(() => {
    return {
      state,
      isReady,
      isPending,
      currentProfile,
      login(input, inviteToken) {
        const normalizedEmail = input.email.trim().toLowerCase();
        let nextTripId: string | undefined;

        updateState((previous) => {
          const existing = previous.profiles.find((profile) => profile.email === normalizedEmail);
          const profileId = existing?.id ?? createId("profile");
          const profile: Profile = {
            id: profileId,
            email: normalizedEmail,
            displayName: input.displayName.trim(),
            homeCity: input.homeCity.trim(),
            passport: input.passport.trim().toUpperCase(),
            createdAt: existing?.createdAt ?? new Date().toISOString()
          };

          const profiles = existing
            ? previous.profiles.map((item) => (item.id === existing.id ? profile : item))
            : [...previous.profiles, profile];

          let nextState: AppState = {
            ...previous,
            profiles,
            currentProfileId: profileId
          };

          if (inviteToken) {
            const joinResult = joinTripByInviteTokenInternal(nextState, profileId, inviteToken);
            nextState = joinResult.state;
            nextTripId = joinResult.tripId;
          }

          return nextState;
        });

        return nextTripId;
      },
      logout() {
        updateState((previous) => ({ ...previous, currentProfileId: null }));
      },
      updateCurrentProfile(input) {
        if (!currentProfile) {
          return;
        }

        updateState((previous) => ({
          ...previous,
          profiles: previous.profiles.map((profile) =>
            profile.id === currentProfile.id
              ? {
                  ...profile,
                  displayName: input.displayName.trim(),
                  homeCity: input.homeCity.trim(),
                  passport: input.passport.trim().toUpperCase(),
                  photoUrl: input.photoUrl.trim() || undefined
                }
              : profile
          )
        }));
      },
      addProfileAvailabilityWindow(input) {
        if (!currentProfile) {
          return;
        }

        updateState((previous) => ({
          ...previous,
          profileAvailabilityWindows: [
            {
              id: createId("profilewin"),
              profileId: currentProfile.id,
              label: input.label.trim(),
              startMonthDay: input.startMonthDay,
              endMonthDay: input.endMonthDay
            },
            ...previous.profileAvailabilityWindows
          ]
        }));
      },
      removeProfileAvailabilityWindow(windowId) {
        updateState((previous) => ({
          ...previous,
          profileAvailabilityWindows: previous.profileAvailabilityWindows.filter(
            (window) => window.id !== windowId
          )
        }));
      },
      createTrip(input) {
        if (!currentProfile) {
          throw new Error("Must be logged in to create a trip.");
        }

        const tripId = createId("trip");
        const now = new Date().toISOString();
        updateState((previous) => ({
          ...previous,
          trips: [
            {
              id: tripId,
              title: input.title.trim(),
              groupName: input.groupName.trim(),
              summary: input.summary.trim(),
              tentativeStart: input.tentativeStart,
              tentativeEnd: input.tentativeEnd,
              creatorProfileId: currentProfile.id,
              finalDateOptionIds: [],
              status: "collecting_members",
              createdAt: now
            },
            ...previous.trips
          ],
          tripMembers: [
            {
              id: createId("member"),
              tripId,
              profileId: currentProfile.id,
              role: "planner",
              joinedAt: now
            },
            ...previous.tripMembers
          ]
        }));
        return tripId;
      },
      updateTripStatus(tripId, status) {
        updateState((previous) => {
          const finalDateOptions = getFinalDateOptionsForTrip(previous, tripId);
          const shortlistedDestinations = previous.tripDestinations.filter(
            (entry) => entry.tripId === tripId && entry.shortlist
          );

          return {
            ...previous,
            trips: previous.trips.map((trip) => {
              if (trip.id !== tripId) {
                return trip;
              }

              if (status === "voting" && (shortlistedDestinations.length === 0 || finalDateOptions.length === 0)) {
                return trip;
              }

              if (status === "decided" && trip.status !== "voting") {
                return trip;
              }

              return {
                ...trip,
                status,
                decidedAt: status === "decided" ? new Date().toISOString() : trip.decidedAt
              };
            })
          };
        });
      },
      setFinalDateOptions(tripId, optionIds) {
        updateState((previous) => ({
          ...previous,
          trips: previous.trips.map((trip) =>
            trip.id === tripId ? { ...trip, finalDateOptionIds: optionIds } : trip
          )
        }));
      },
      createInviteLink(tripId) {
        const invite: TripInvite = {
          id: createId("invite"),
          tripId,
          type: "link",
          token: createId("link"),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString()
        };
        updateState((previous) => ({
          ...previous,
          tripInvites: [invite, ...previous.tripInvites]
        }));
        return invite;
      },
      inviteByEmail(tripId, email) {
        const invite: TripInvite = {
          id: createId("invite"),
          tripId,
          type: "email",
          email: email.trim().toLowerCase(),
          token: createId("email"),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString()
        };
        updateState((previous) => ({
          ...previous,
          tripInvites: [invite, ...previous.tripInvites]
        }));
      },
      revokeInvite(inviteId) {
        updateState((previous) => ({
          ...previous,
          tripInvites: previous.tripInvites.map((invite) =>
            invite.id === inviteId && getInviteStatus(invite) === "pending"
              ? { ...invite, revokedAt: new Date().toISOString() }
              : invite
          )
        }));
      },
      joinTripByInviteToken(token) {
        if (!currentProfile) {
          return undefined;
        }

        let joinedTripId: string | undefined;
        updateState((previous) => {
          const result = joinTripByInviteTokenInternal(previous, currentProfile.id, token);
          joinedTripId = result.tripId;
          return result.state;
        });
        return joinedTripId;
      },
      addAvailability(tripId, startDate, endDate) {
        if (!currentProfile) {
          return;
        }

        const range: AvailabilityRange = {
          id: createId("range"),
          tripId,
          profileId: currentProfile.id,
          startDate,
          endDate
        };

        updateState((previous) => ({
          ...previous,
          availabilityRanges: [range, ...previous.availabilityRanges]
        }));
      },
      removeAvailability(rangeId) {
        updateState((previous) => ({
          ...previous,
          availabilityRanges: previous.availabilityRanges.filter((range) => range.id !== rangeId)
        }));
      },
      addDestinationToTrip(tripId, destination, note) {
        if (!currentProfile) {
          return;
        }

        updateState((previous) => {
          const exists = previous.tripDestinations.some(
            (entry) => entry.tripId === tripId && entry.destinationId === destination.id
          );
          if (exists) {
            return previous;
          }

          return {
            ...previous,
            tripDestinations: [
              {
                id: createId("tripdest"),
                tripId,
                destinationId: destination.id,
                destinationSnapshot: destination,
                addedByProfileId: currentProfile.id,
                note: note.trim(),
                shortlist: false,
                createdAt: new Date().toISOString()
              },
              ...previous.tripDestinations
            ]
          };
        });
      },
      toggleDestinationShortlist(tripDestinationId) {
        updateState((previous) => ({
          ...previous,
          tripDestinations: previous.tripDestinations.map((entry) =>
            entry.id === tripDestinationId ? { ...entry, shortlist: !entry.shortlist } : entry
          )
        }));
      },
      submitVote(tripId, type, optionId) {
        if (!currentProfile) {
          return;
        }

        const vote: Vote = {
          id: createId("vote"),
          tripId,
          profileId: currentProfile.id,
          type,
          optionId,
          createdAt: new Date().toISOString()
        };

        updateState((previous) => ({
          ...previous,
          votes: [
            vote,
            ...previous.votes.filter(
              (item) =>
                !(
                  item.tripId === tripId &&
                  item.profileId === currentProfile.id &&
                  item.type === type
                )
            )
          ]
        }));
      },
      getTripById(tripId) {
        return state.trips.find((trip) => trip.id === tripId);
      },
      getTripMembers(tripId) {
        return state.tripMembers
          .filter((member) => member.tripId === tripId)
          .map((member) => ({
            ...member,
            profile: state.profiles.find((profile) => profile.id === member.profileId)
          }));
      },
      getTripInvites(tripId) {
        return state.tripInvites.filter((invite) => invite.tripId === tripId);
      },
      getInviteStatus(invite) {
        return getInviteStatus(invite);
      },
      getFinalDateOptions(tripId) {
        return getFinalDateOptionsForTrip(state, tripId);
      },
      getTripDestinations(tripId) {
        return state.tripDestinations
          .filter((entry) => entry.tripId === tripId)
          .map((entry) => ({
            ...entry,
            destination:
              entry.destinationSnapshot ??
              destinationCatalog.find((item) => item.id === entry.destinationId)
          }));
      },
      getTripAvailability(tripId) {
        return state.availabilityRanges.filter((range) => range.tripId === tripId);
      },
      getProfileAvailabilityWindows(profileId) {
        const targetProfileId = profileId ?? currentProfile?.id;
        if (!targetProfileId) {
          return [];
        }

        return (state.profileAvailabilityWindows ?? []).filter(
          (window) => window.profileId === targetProfileId
        );
      },
      getSuggestedProfileAvailability(tripId, profileId) {
        const trip = state.trips.find((item) => item.id === tripId);
        const targetProfileId = profileId ?? currentProfile?.id;
        if (!trip || !targetProfileId) {
          return [];
        }

        return (state.profileAvailabilityWindows ?? [])
          .filter((window) => window.profileId === targetProfileId)
          .map((window) => mapWindowToTripDates(window, trip.tentativeStart, trip.tentativeEnd))
          .filter(
            (
              suggestion
            ): suggestion is { label: string; startDate: string; endDate: string; sourceWindowId: string } =>
              suggestion !== null
          );
      },
      getDateWindowOptions(tripId) {
        const trip = state.trips.find((item) => item.id === tripId);
        if (!trip) {
          return [];
        }

        const members = state.tripMembers.filter((item) => item.tripId === tripId);
        const ranges = state.availabilityRanges.filter((item) => item.tripId === tripId);
        return computeDateWindowOptions(trip.tentativeStart, trip.tentativeEnd, members, ranges);
      },
      getVoteForCurrentUser(tripId, type) {
        if (!currentProfile) {
          return undefined;
        }

        return state.votes.find(
          (vote) =>
            vote.tripId === tripId && vote.profileId === currentProfile.id && vote.type === type
        );
      },
      getVotesForTrip(tripId, type) {
        return state.votes.filter((vote) => vote.tripId === tripId && vote.type === type);
      },
      getVisibleTrips() {
        if (!currentProfile) {
          return { created: [], joined: [] };
        }

        const created = sortTrips(
          state.trips.filter((trip) => trip.creatorProfileId === currentProfile.id)
        );
        const joinedTripIds = new Set(
          state.tripMembers
            .filter((member) => member.profileId === currentProfile.id)
            .map((member) => member.tripId)
        );
        const joined = sortTrips(
          state.trips.filter(
            (trip) => joinedTripIds.has(trip.id) && trip.creatorProfileId !== currentProfile.id
          )
        );
        return { created, joined };
      },
      getInvitePreview(token) {
        const invite = state.tripInvites.find((item) => item.token === token);
        const trip = invite ? state.trips.find((item) => item.id === invite.tripId) : undefined;
        const planner = trip
          ? state.profiles.find((profile) => profile.id === trip.creatorProfileId)
          : undefined;
        const memberCount = trip
          ? state.tripMembers.filter((member) => member.tripId === trip.id).length
          : 0;
        return { invite, trip, planner, memberCount };
      }
    };
  }, [currentProfile, isPending, isReady, state]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

function joinTripByInviteTokenInternal(
  previous: AppState,
  profileId: string,
  token: string
): { state: AppState; tripId?: string } {
  const invite = previous.tripInvites.find((item) => item.token === token);
  if (!invite || getInviteStatus(invite) !== "pending") {
    return { state: previous };
  }

  const alreadyJoined = previous.tripMembers.some(
    (member) => member.tripId === invite.tripId && member.profileId === profileId
  );

  const tripMembers = alreadyJoined
      ? previous.tripMembers
    : [
        {
          id: createId("member"),
          tripId: invite.tripId,
          profileId,
          role: "member" as const,
          joinedAt: new Date().toISOString()
        },
        ...previous.tripMembers
      ];

  const tripInvites = previous.tripInvites.map((item) =>
    item.id === invite.id && item.type === "email"
      ? { ...item, acceptedAt: item.acceptedAt ?? new Date().toISOString() }
      : item
  );

  return {
    state: {
      ...previous,
      tripMembers,
      tripInvites
    },
    tripId: invite.tripId
  };
}

function getFinalDateOptionsForTrip(state: AppState, tripId: string) {
  const trip = state.trips.find((item) => item.id === tripId);
  if (!trip) {
    return [];
  }

  const members = state.tripMembers.filter((item) => item.tripId === tripId);
  const ranges = state.availabilityRanges.filter((item) => item.tripId === tripId);
  const options = computeDateWindowOptions(trip.tentativeStart, trip.tentativeEnd, members, ranges);
  return options.filter((option) => trip.finalDateOptionIds.includes(option.id));
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return context;
}

function mapWindowToTripDates(
  window: ProfileAvailabilityWindow,
  tripStart: string,
  tripEnd: string
) {
  const startYear = tripStart.slice(0, 4);
  const endYear = tripEnd.slice(0, 4);
  const candidates = [
    `${startYear}-${window.startMonthDay}`,
    `${endYear}-${window.startMonthDay}`
  ].flatMap((candidateStart) => {
    const candidateYear = candidateStart.slice(0, 4);
    const endMonthDay = window.endMonthDay;
    const crossesYear = window.endMonthDay < window.startMonthDay;
    const candidateEnd = `${String(Number(candidateYear) + (crossesYear ? 1 : 0))}-${endMonthDay}`;
    return [{ candidateStart, candidateEnd }];
  });

  for (const candidate of candidates) {
    const overlapStart = candidate.candidateStart > tripStart ? candidate.candidateStart : tripStart;
    const overlapEnd = candidate.candidateEnd < tripEnd ? candidate.candidateEnd : tripEnd;
    if (overlapStart <= overlapEnd) {
      return {
        label: window.label,
        startDate: overlapStart,
        endDate: overlapEnd,
        sourceWindowId: window.id
      };
    }
  }

  return null;
}

export { destinationCatalog };
