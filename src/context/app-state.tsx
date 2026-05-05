"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import type { User } from "@supabase/supabase-js";
import { computeDateWindowOptions } from "@/lib/availability";
import { destinationCatalog } from "@/lib/destinations";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type {
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

const LOCAL_PLANNING_STORAGE_PREFIX = "roammate-planning-state-v2";

interface PersistedState {
  profiles: Profile[];
  currentProfileId: string | null;
  trips: Trip[];
  tripMembers: TripMember[];
  tripInvites: TripInvite[];
}

interface LocalPlanningState {
  profileAvailabilityWindows: ProfileAvailabilityWindow[];
  availabilityRanges: AvailabilityRange[];
  tripDestinations: TripDestination[];
  votes: Vote[];
  tripFinalDateOptionIds: Record<string, string[]>;
}

const emptyPersistedState: PersistedState = {
  profiles: [],
  currentProfileId: null,
  trips: [],
  tripMembers: [],
  tripInvites: []
};

const emptyPlanningState: LocalPlanningState = {
  profileAvailabilityWindows: [],
  availabilityRanges: [],
  tripDestinations: [],
  votes: [],
  tripFinalDateOptionIds: {}
};

function normalizePlanningState(candidate: Partial<LocalPlanningState> | null | undefined): LocalPlanningState {
  return {
    profileAvailabilityWindows: candidate?.profileAvailabilityWindows ?? [],
    availabilityRanges: candidate?.availabilityRanges ?? [],
    tripDestinations: candidate?.tripDestinations ?? [],
    votes: candidate?.votes ?? [],
    tripFinalDateOptionIds: candidate?.tripFinalDateOptionIds ?? {}
  };
}

function getPlanningStorageKey(profileId: string) {
  return `${LOCAL_PLANNING_STORAGE_PREFIX}:${profileId}`;
}

function createUuid(prefix: string) {
  return globalThis.crypto?.randomUUID?.() ?? createId(prefix);
}

function createInviteToken() {
  return globalThis.crypto?.randomUUID?.().replace(/-/g, "") ?? createId("invite");
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
  password: string;
  mode: "login" | "signup";
  nextPath?: string;
  inviteToken?: string;
}

interface UpdateProfileInput {
  displayName: string;
  homeCity: string;
  passport: string;
  photoUrl: string;
}

interface InvitePreview {
  invite: TripInvite | undefined;
  trip: Trip | undefined;
  planner: Profile | undefined;
  memberCount: number;
}

interface AppStateValue {
  isConfigured: boolean;
  isReady: boolean;
  isPending: boolean;
  currentProfile: Profile | null;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  updateCurrentProfile: (input: UpdateProfileInput) => Promise<void>;
  addProfileAvailabilityWindow: (input: {
    label: string;
    startMonthDay: string;
    endMonthDay: string;
  }) => void;
  removeProfileAvailabilityWindow: (windowId: string) => void;
  createTrip: (input: CreateTripInput) => Promise<string>;
  updateTripStatus: (tripId: string, status: TripStatus) => Promise<void>;
  setFinalDateOptions: (tripId: string, optionIds: string[]) => void;
  createInviteLink: (tripId: string) => Promise<TripInvite>;
  inviteByEmail: (tripId: string, email: string) => Promise<void>;
  revokeInvite: (inviteId: string) => Promise<void>;
  joinTripByInviteToken: (token: string) => Promise<string | undefined>;
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
  getTripDestinations: (tripId: string) => (TripDestination & {
    destination: DestinationCatalogItem | undefined;
  })[];
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
  getInvitePreview: (token: string) => Promise<InvitePreview>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

function sortTrips(trips: Trip[]) {
  return [...trips].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function mapProfile(row: {
  id: string;
  email: string;
  display_name: string;
  home_city: string | null;
  passport: string | null;
  photo_url: string | null;
  created_at: string;
}): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    homeCity: row.home_city ?? "",
    passport: row.passport ?? "",
    photoUrl: row.photo_url ?? undefined,
    createdAt: row.created_at
  };
}

function mapTrip(row: {
  id: string;
  creator_profile_id: string;
  title: string;
  group_name: string;
  summary: string;
  tentative_start: string;
  tentative_end: string;
  status: TripStatus;
  created_at: string;
  decided_at: string | null;
}): Trip {
  return {
    id: row.id,
    title: row.title,
    groupName: row.group_name,
    summary: row.summary,
    tentativeStart: row.tentative_start,
    tentativeEnd: row.tentative_end,
    creatorProfileId: row.creator_profile_id,
    finalDateOptionIds: [],
    status: row.status,
    createdAt: row.created_at,
    decidedAt: row.decided_at ?? undefined
  };
}

function mapTripMember(row: {
  id: string;
  trip_id: string;
  profile_id: string;
  role: "planner" | "member";
  joined_at: string;
}): TripMember {
  return {
    id: row.id,
    tripId: row.trip_id,
    profileId: row.profile_id,
    role: row.role,
    joinedAt: row.joined_at
  };
}

function mapTripInvite(row: {
  id: string;
  trip_id: string;
  type: "email" | "link";
  token: string;
  email: string | null;
  created_at: string;
  expires_at: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
}): TripInvite {
  return {
    id: row.id,
    tripId: row.trip_id,
    type: row.type,
    token: row.token,
    email: row.email ?? undefined,
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? undefined,
    acceptedAt: row.accepted_at ?? undefined,
    revokedAt: row.revoked_at ?? undefined
  };
}

async function loadPersistedStateForUser(userId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return emptyPersistedState;
  }

  const [profileResult, createdTripsResult, membershipResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, display_name, home_city, passport, photo_url, created_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("trips")
      .select(
        "id, creator_profile_id, title, group_name, summary, tentative_start, tentative_end, status, created_at, decided_at"
      )
      .eq("creator_profile_id", userId),
    supabase
      .from("trip_members")
      .select("id, trip_id, profile_id, role, joined_at")
      .eq("profile_id", userId)
  ]);

  const createdTrips = (createdTripsResult.data ?? []).map(mapTrip);
  const membershipRows = (membershipResult.data ?? []).map(mapTripMember);
  const visibleTripIds = new Set([
    ...createdTrips.map((trip) => trip.id),
    ...membershipRows.map((member) => member.tripId)
  ]);

  const tripIds = Array.from(visibleTripIds);

  const [joinedTripsResult, allMembersResult, invitesResult] = tripIds.length
    ? await Promise.all([
        supabase
          .from("trips")
          .select(
            "id, creator_profile_id, title, group_name, summary, tentative_start, tentative_end, status, created_at, decided_at"
          )
          .in("id", tripIds),
        supabase
          .from("trip_members")
          .select("id, trip_id, profile_id, role, joined_at")
          .in("trip_id", tripIds),
        supabase
          .from("trip_invites")
          .select(
            "id, trip_id, type, token, email, created_at, expires_at, accepted_at, revoked_at"
          )
          .in("trip_id", tripIds)
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const tripById = new Map<string, Trip>();
  for (const trip of [...createdTrips, ...((joinedTripsResult.data ?? []) as never[]).map(mapTrip)]) {
    tripById.set(trip.id, trip);
  }

  const trips = sortTrips(Array.from(tripById.values()));
  const tripMembers = ((allMembersResult.data ?? []) as never[]).map(mapTripMember);
  const tripInvites = ((invitesResult.data ?? []) as never[]).map(mapTripInvite);

  const relatedProfileIds = new Set<string>([userId]);
  for (const member of tripMembers) {
    relatedProfileIds.add(member.profileId);
  }
  for (const trip of trips) {
    relatedProfileIds.add(trip.creatorProfileId);
  }

  const profilesResult = relatedProfileIds.size
    ? await supabase
        .from("profiles")
        .select("id, email, display_name, home_city, passport, photo_url, created_at")
        .in("id", Array.from(relatedProfileIds))
    : { data: [] };

  const profiles = ((profilesResult.data ?? []) as never[]).map(mapProfile);
  if (profileResult.data) {
    const current = mapProfile(profileResult.data);
    if (!profiles.some((profile) => profile.id === current.id)) {
      profiles.unshift(current);
    }
  }

  return {
    profiles,
    currentProfileId: userId,
    trips,
    tripMembers,
    tripInvites
  };
}

async function ensureProfile(user: User) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !user.email) {
    return null;
  }

  const email = user.email.trim().toLowerCase();
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, email, display_name, home_city, passport, photo_url, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    return mapProfile(existing);
  }

  const fallbackName = email.split("@")[0]?.replace(/[._-]+/g, " ") ?? "Traveler";
  const displayName = fallbackName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

  const inserted = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email,
      display_name: displayName || "Traveler",
      home_city: "",
      passport: "",
      photo_url: null
    })
    .select("id, email, display_name, home_city, passport, photo_url, created_at")
    .single();

  return inserted.data ? mapProfile(inserted.data) : null;
}

function applyTripLocalState(trip: Trip, localPlanningState: LocalPlanningState): Trip {
  return {
    ...trip,
    finalDateOptionIds: localPlanningState.tripFinalDateOptionIds[trip.id] ?? trip.finalDateOptionIds
  };
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [persistedState, setPersistedState] = useState<PersistedState>(emptyPersistedState);
  const [localPlanningState, setLocalPlanningState] = useState<LocalPlanningState>(emptyPlanningState);
  const [isReady, setIsReady] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const loadIdRef = useRef(0);
  const configured = isSupabaseConfigured();

  async function refreshForUser(userId: string) {
    const nextState = await loadPersistedStateForUser(userId);
    setPersistedState(nextState);

    const raw = window.localStorage.getItem(getPlanningStorageKey(userId));
    setLocalPlanningState(normalizePlanningState(raw ? (JSON.parse(raw) as Partial<LocalPlanningState>) : null));
  }

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setIsReady(true);
      return;
    }
    const supabase = client;

    let active = true;
    const loadId = ++loadIdRef.current;

    async function syncFromSession() {
      setIsPending(true);
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!active || loadId !== loadIdRef.current) {
        return;
      }

      if (!session?.user) {
        setPersistedState(emptyPersistedState);
        setLocalPlanningState(emptyPlanningState);
        setIsPending(false);
        setIsReady(true);
        return;
      }

      await ensureProfile(session.user);
      await refreshForUser(session.user.id);

      if (!active || loadId !== loadIdRef.current) {
        return;
      }

      setIsPending(false);
      setIsReady(true);
    }

    void syncFromSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextLoadId = ++loadIdRef.current;
      setIsPending(true);
      void (async () => {
        if (!session?.user) {
          if (active && nextLoadId === loadIdRef.current) {
            setPersistedState(emptyPersistedState);
            setLocalPlanningState(emptyPlanningState);
            setIsPending(false);
            setIsReady(true);
          }
          return;
        }

        await ensureProfile(session.user);
        await refreshForUser(session.user.id);

        if (active && nextLoadId === loadIdRef.current) {
          setIsPending(false);
          setIsReady(true);
        }
      })();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isReady || !persistedState.currentProfileId) {
      return;
    }

    window.localStorage.setItem(
      getPlanningStorageKey(persistedState.currentProfileId),
      JSON.stringify(localPlanningState)
    );
  }, [isReady, localPlanningState, persistedState.currentProfileId]);

  const currentProfile =
    persistedState.profiles.find((profile) => profile.id === persistedState.currentProfileId) ?? null;

  const value = useMemo<AppStateValue>(() => {
    async function withPending<T>(operation: () => Promise<T>) {
      setIsPending(true);
      try {
        return await operation();
      } finally {
        setIsPending(false);
      }
    }

    return {
      isConfigured: configured,
      isReady,
      isPending,
      currentProfile,
      async login(input) {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          throw new Error("Supabase is not configured.");
        }

        const email = input.email.trim().toLowerCase();
        const password = input.password;

        await withPending(async () => {
          if (input.mode === "signup") {
            const { error } = await supabase.auth.signUp({
              email,
              password
            });

            if (error) {
              throw error;
            }

            return;
          }

          const { error } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (error) {
            throw error;
          }
        });
      },
      async logout() {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          return;
        }

        await withPending(async () => {
          await supabase.auth.signOut();
        });
      },
      async updateCurrentProfile(input) {
        if (!currentProfile) {
          return;
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          return;
        }

        await withPending(async () => {
          await supabase
            .from("profiles")
            .update({
              display_name: input.displayName.trim(),
              home_city: input.homeCity.trim(),
              passport: input.passport.trim().toUpperCase(),
              photo_url: input.photoUrl.trim() || null
            })
            .eq("id", currentProfile.id);

          await refreshForUser(currentProfile.id);
        });
      },
      addProfileAvailabilityWindow(input) {
        if (!currentProfile) {
          return;
        }

        setLocalPlanningState((previous) => ({
          ...previous,
          profileAvailabilityWindows: [
            {
              id: createUuid("profilewin"),
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
        setLocalPlanningState((previous) => ({
          ...previous,
          profileAvailabilityWindows: previous.profileAvailabilityWindows.filter(
            (window) => window.id !== windowId
          )
        }));
      },
      async createTrip(input) {
        if (!currentProfile) {
          throw new Error("Must be logged in to create a trip.");
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          throw new Error("Supabase is not configured.");
        }

        const tripId = createUuid("trip");
        const memberId = createUuid("member");
        const now = new Date().toISOString();
        const nextTrip: Trip = {
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
        };
        const nextMember: TripMember = {
          id: memberId,
          tripId,
          profileId: currentProfile.id,
          role: "planner",
          joinedAt: now
        };

        await withPending(async () => {
          const tripInsert = await supabase.from("trips").insert({
            id: tripId,
            creator_profile_id: currentProfile.id,
            title: nextTrip.title,
            group_name: nextTrip.groupName,
            summary: nextTrip.summary,
            tentative_start: nextTrip.tentativeStart,
            tentative_end: nextTrip.tentativeEnd,
            status: "collecting_members"
          });
          if (tripInsert.error) {
            throw tripInsert.error;
          }

          const memberInsert = await supabase.from("trip_members").insert({
            id: memberId,
            trip_id: tripId,
            profile_id: currentProfile.id,
            role: "planner",
            joined_at: now
          });
          if (memberInsert.error) {
            throw memberInsert.error;
          }

          setPersistedState((previous) => ({
            ...previous,
            trips: sortTrips(
              previous.trips.some((trip) => trip.id === tripId)
                ? previous.trips
                : [nextTrip, ...previous.trips]
            ),
            tripMembers: previous.tripMembers.some((member) => member.id === memberId)
              ? previous.tripMembers
              : [nextMember, ...previous.tripMembers]
          }));

          await refreshForUser(currentProfile.id);
        });

        return tripId;
      },
      async updateTripStatus(tripId, status) {
        if (!currentProfile) {
          return;
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          return;
        }

        const finalDateOptions = getFinalDateOptionsForTrip(
          persistedState.trips,
          localPlanningState,
          localPlanningState.availabilityRanges,
          persistedState.tripMembers,
          tripId
        );
        const shortlistedDestinations = localPlanningState.tripDestinations.filter(
          (entry) => entry.tripId === tripId && entry.shortlist
        );

        if (status === "voting" && (shortlistedDestinations.length === 0 || finalDateOptions.length === 0)) {
          return;
        }

        const trip = persistedState.trips.find((item) => item.id === tripId);
        if (!trip || (status === "decided" && trip.status !== "voting")) {
          return;
        }

        await withPending(async () => {
          await supabase
            .from("trips")
            .update({
              status,
              decided_at: status === "decided" ? new Date().toISOString() : trip.decidedAt ?? null
            })
            .eq("id", tripId);

          await refreshForUser(currentProfile.id);
        });
      },
      setFinalDateOptions(tripId, optionIds) {
        setLocalPlanningState((previous) => ({
          ...previous,
          tripFinalDateOptionIds: {
            ...previous.tripFinalDateOptionIds,
            [tripId]: optionIds
          }
        }));
      },
      async createInviteLink(tripId) {
        if (!currentProfile) {
          throw new Error("Must be logged in to invite people.");
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          throw new Error("Supabase is not configured.");
        }

        const inviteId = createUuid("invite");
        const token = createInviteToken();
        const createdAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        await withPending(async () => {
          await supabase.from("trip_invites").insert({
            id: inviteId,
            trip_id: tripId,
            type: "link",
            token,
            created_at: createdAt,
            expires_at: expiresAt
          });

          await refreshForUser(currentProfile.id);
        });

        return {
          id: inviteId,
          tripId,
          type: "link",
          token,
          createdAt,
          expiresAt
        };
      },
      async inviteByEmail(tripId, email) {
        if (!currentProfile) {
          return;
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          return;
        }

        await withPending(async () => {
          await supabase.from("trip_invites").insert({
            id: createUuid("invite"),
            trip_id: tripId,
            type: "email",
            token: createInviteToken(),
            email: email.trim().toLowerCase(),
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });

          await refreshForUser(currentProfile.id);
        });
      },
      async revokeInvite(inviteId) {
        if (!currentProfile) {
          return;
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          return;
        }

        await withPending(async () => {
          await supabase
            .from("trip_invites")
            .update({ revoked_at: new Date().toISOString() })
            .eq("id", inviteId);

          await refreshForUser(currentProfile.id);
        });
      },
      async joinTripByInviteToken(token) {
        if (!currentProfile) {
          return undefined;
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          return undefined;
        }

        return withPending(async () => {
          const inviteResult = await supabase
            .from("trip_invites")
            .select(
              "id, trip_id, type, token, email, created_at, expires_at, accepted_at, revoked_at"
            )
            .eq("token", token)
            .maybeSingle();

          if (!inviteResult.data) {
            return undefined;
          }

          const invite = mapTripInvite(inviteResult.data);
          if (getInviteStatus(invite) !== "pending") {
            return undefined;
          }

          const membershipResult = await supabase
            .from("trip_members")
            .select("id")
            .eq("trip_id", invite.tripId)
            .eq("profile_id", currentProfile.id)
            .maybeSingle();

          if (!membershipResult.data) {
            await supabase.from("trip_members").insert({
              id: createUuid("member"),
              trip_id: invite.tripId,
              profile_id: currentProfile.id,
              role: "member"
            });
          }

          if (invite.type === "email" && !invite.acceptedAt) {
            await supabase
              .from("trip_invites")
              .update({ accepted_at: new Date().toISOString() })
              .eq("id", invite.id);
          }

          await refreshForUser(currentProfile.id);
          return invite.tripId;
        });
      },
      addAvailability(tripId, startDate, endDate) {
        if (!currentProfile) {
          return;
        }

        setLocalPlanningState((previous) => ({
          ...previous,
          availabilityRanges: [
            {
              id: createUuid("range"),
              tripId,
              profileId: currentProfile.id,
              startDate,
              endDate
            },
            ...previous.availabilityRanges
          ]
        }));
      },
      removeAvailability(rangeId) {
        setLocalPlanningState((previous) => ({
          ...previous,
          availabilityRanges: previous.availabilityRanges.filter((range) => range.id !== rangeId)
        }));
      },
      addDestinationToTrip(tripId, destination, note) {
        if (!currentProfile) {
          return;
        }

        setLocalPlanningState((previous) => {
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
                id: createUuid("tripdest"),
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
        setLocalPlanningState((previous) => ({
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

        setLocalPlanningState((previous) => ({
          ...previous,
          votes: [
            {
              id: createUuid("vote"),
              tripId,
              profileId: currentProfile.id,
              type,
              optionId,
              createdAt: new Date().toISOString()
            },
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
        const trip = persistedState.trips.find((item) => item.id === tripId);
        return trip ? applyTripLocalState(trip, localPlanningState) : undefined;
      },
      getTripMembers(tripId) {
        return persistedState.tripMembers
          .filter((member) => member.tripId === tripId)
          .map((member) => ({
            ...member,
            profile: persistedState.profiles.find((profile) => profile.id === member.profileId)
          }));
      },
      getTripInvites(tripId) {
        return persistedState.tripInvites.filter((invite) => invite.tripId === tripId);
      },
      getInviteStatus(invite) {
        return getInviteStatus(invite);
      },
      getFinalDateOptions(tripId) {
        return getFinalDateOptionsForTrip(
          persistedState.trips,
          localPlanningState,
          localPlanningState.availabilityRanges,
          persistedState.tripMembers,
          tripId
        );
      },
      getTripDestinations(tripId) {
        return localPlanningState.tripDestinations
          .filter((entry) => entry.tripId === tripId)
          .map((entry) => ({
            ...entry,
            destination:
              entry.destinationSnapshot ??
              destinationCatalog.find((item) => item.id === entry.destinationId)
          }));
      },
      getTripAvailability(tripId) {
        return localPlanningState.availabilityRanges.filter((range) => range.tripId === tripId);
      },
      getProfileAvailabilityWindows(profileId) {
        const targetProfileId = profileId ?? currentProfile?.id;
        if (!targetProfileId) {
          return [];
        }

        return localPlanningState.profileAvailabilityWindows.filter(
          (window) => window.profileId === targetProfileId
        );
      },
      getSuggestedProfileAvailability(tripId, profileId) {
        const trip = persistedState.trips.find((item) => item.id === tripId);
        const targetProfileId = profileId ?? currentProfile?.id;
        if (!trip || !targetProfileId) {
          return [];
        }

        return localPlanningState.profileAvailabilityWindows
          .filter((window) => window.profileId === targetProfileId)
          .map((window) => mapWindowToTripDates(window, trip.tentativeStart, trip.tentativeEnd))
          .filter(
            (
              suggestion
            ): suggestion is {
              label: string;
              startDate: string;
              endDate: string;
              sourceWindowId: string;
            } => suggestion !== null
          );
      },
      getDateWindowOptions(tripId) {
        const trip = persistedState.trips.find((item) => item.id === tripId);
        if (!trip) {
          return [];
        }

        const members = persistedState.tripMembers.filter((item) => item.tripId === tripId);
        const ranges = localPlanningState.availabilityRanges.filter((item) => item.tripId === tripId);
        return computeDateWindowOptions(trip.tentativeStart, trip.tentativeEnd, members, ranges);
      },
      getVoteForCurrentUser(tripId, type) {
        if (!currentProfile) {
          return undefined;
        }

        return localPlanningState.votes.find(
          (vote) =>
            vote.tripId === tripId && vote.profileId === currentProfile.id && vote.type === type
        );
      },
      getVotesForTrip(tripId, type) {
        return localPlanningState.votes.filter(
          (vote) => vote.tripId === tripId && vote.type === type
        );
      },
      getVisibleTrips() {
        if (!currentProfile) {
          return { created: [], joined: [] };
        }

        const trips = persistedState.trips.map((trip) => applyTripLocalState(trip, localPlanningState));
        const created = sortTrips(
          trips.filter((trip) => trip.creatorProfileId === currentProfile.id)
        );
        const joinedTripIds = new Set(
          persistedState.tripMembers
            .filter((member) => member.profileId === currentProfile.id)
            .map((member) => member.tripId)
        );
        const joined = sortTrips(
          trips.filter(
            (trip) => joinedTripIds.has(trip.id) && trip.creatorProfileId !== currentProfile.id
          )
        );
        return { created, joined };
      },
      async getInvitePreview(token) {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          return { invite: undefined, trip: undefined, planner: undefined, memberCount: 0 };
        }

        const inviteResult = await supabase
          .from("trip_invites")
          .select(
            "id, trip_id, type, token, email, created_at, expires_at, accepted_at, revoked_at"
          )
          .eq("token", token)
          .maybeSingle();

        if (!inviteResult.data) {
          return { invite: undefined, trip: undefined, planner: undefined, memberCount: 0 };
        }

        const invite = mapTripInvite(inviteResult.data);
        const [tripResult, memberCountResult] = await Promise.all([
          supabase
            .from("trips")
            .select(
              "id, creator_profile_id, title, group_name, summary, tentative_start, tentative_end, status, created_at, decided_at"
            )
            .eq("id", invite.tripId)
            .maybeSingle(),
          supabase
            .from("trip_members")
            .select("id", { count: "exact", head: true })
            .eq("trip_id", invite.tripId)
        ]);

        const trip = tripResult.data ? mapTrip(tripResult.data) : undefined;
        if (!trip) {
          return { invite, trip: undefined, planner: undefined, memberCount: 0 };
        }

        const plannerResult = await supabase
          .from("profiles")
          .select("id, email, display_name, home_city, passport, photo_url, created_at")
          .eq("id", trip.creatorProfileId)
          .maybeSingle();

        return {
          invite,
          trip,
          planner: plannerResult.data ? mapProfile(plannerResult.data) : undefined,
          memberCount: memberCountResult.count ?? 0
        };
      }
    };
  }, [configured, currentProfile, isPending, isReady, localPlanningState, persistedState]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

function getFinalDateOptionsForTrip(
  trips: Trip[],
  localPlanningState: LocalPlanningState,
  availabilityRanges: AvailabilityRange[],
  tripMembers: TripMember[],
  tripId: string
) {
  const trip = trips.find((item) => item.id === tripId);
  if (!trip) {
    return [];
  }

  const members = tripMembers.filter((item) => item.tripId === tripId);
  const ranges = availabilityRanges.filter((item) => item.tripId === tripId);
  const options = computeDateWindowOptions(trip.tentativeStart, trip.tentativeEnd, members, ranges);
  const finalIds = localPlanningState.tripFinalDateOptionIds[tripId] ?? trip.finalDateOptionIds;
  return options.filter((option) => finalIds.includes(option.id));
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
  ].map((candidateStart) => {
    const candidateYear = candidateStart.slice(0, 4);
    const crossesYear = window.endMonthDay < window.startMonthDay;
    const candidateEnd = `${String(Number(candidateYear) + (crossesYear ? 1 : 0))}-${window.endMonthDay}`;
    return { candidateStart, candidateEnd };
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
