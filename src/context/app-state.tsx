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
  DestinationEnrichment,
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

interface PersistedState {
  profiles: Profile[];
  currentProfileId: string | null;
  trips: Trip[];
  tripMembers: TripMember[];
  tripInvites: TripInvite[];
  profileAvailabilityWindows: ProfileAvailabilityWindow[];
  availabilityRanges: AvailabilityRange[];
  tripDestinations: TripDestination[];
  destinationEnrichments: DestinationEnrichment[];
  votes: Vote[];
}

const emptyPersistedState: PersistedState = {
  profiles: [],
  currentProfileId: null,
  trips: [],
  tripMembers: [],
  tripInvites: [],
  profileAvailabilityWindows: [],
  availabilityRanges: [],
  tripDestinations: [],
  destinationEnrichments: [],
  votes: []
};

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
  tripDuration?: number;
}

interface UpdateTripInput {
  tentativeStart: string;
  tentativeEnd: string;
  tripDuration: number;
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
  }) => Promise<void>;
  removeProfileAvailabilityWindow: (windowId: string) => Promise<void>;
  createTrip: (input: CreateTripInput) => Promise<string>;
  updateTrip: (tripId: string, input: UpdateTripInput) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  updateTripStatus: (tripId: string, status: TripStatus) => Promise<void>;
  setFinalDateOptions: (tripId: string, optionIds: string[]) => Promise<void>;
  createInviteLink: (tripId: string) => Promise<TripInvite>;
  inviteByEmail: (tripId: string, email: string) => Promise<void>;
  revokeInvite: (inviteId: string) => Promise<void>;
  joinTripByInviteToken: (token: string) => Promise<string | undefined>;
  removeTripMember: (tripId: string, profileId: string) => Promise<void>;
  leaveTrip: (tripId: string) => Promise<void>;
  addAvailability: (tripId: string, startDate: string, endDate: string) => Promise<void>;
  removeAvailability: (rangeId: string) => Promise<void>;
  addDestinationToTrip: (tripId: string, destination: DestinationCatalogItem, note: string) => Promise<void>;
  toggleDestinationShortlist: (tripDestinationId: string) => Promise<void>;
  submitVote: (tripId: string, type: VoteType, optionId: string) => Promise<void>;
  getTripById: (tripId: string) => Trip | undefined;
  getTripMembers: (tripId: string) => (TripMember & { profile: Profile | undefined })[];
  getTripInvites: (tripId: string) => TripInvite[];
  getInviteStatus: (invite: TripInvite) => InviteStatus;
  getFinalDateOptions: (tripId: string) => DateWindowOption[];
  getTripDestinations: (tripId: string) => (TripDestination & {
    destination: DestinationCatalogItem | undefined;
    enrichment: DestinationEnrichment | undefined;
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
  trip_duration?: number | null;
  status: TripStatus;
  created_at: string;
  decided_at: string | null;
  final_date_option_ids?: string[] | null;
}): Trip {
  return {
    id: row.id,
    title: row.title,
    groupName: row.group_name,
    summary: row.summary,
    tentativeStart: row.tentative_start,
    tentativeEnd: row.tentative_end,
    tripDuration: row.trip_duration ?? 7,
    creatorProfileId: row.creator_profile_id,
    finalDateOptionIds: row.final_date_option_ids ?? [],
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

function mapAvailabilityRange(row: {
  id: string;
  trip_id: string;
  profile_id: string;
  start_date: string;
  end_date: string;
}): AvailabilityRange {
  return {
    id: row.id,
    tripId: row.trip_id,
    profileId: row.profile_id,
    startDate: row.start_date,
    endDate: row.end_date
  };
}

function mapTripDestination(
  row: {
    id: string;
    trip_id: string;
    destination_id: string;
    added_by_profile_id: string;
    note: string;
    shortlist: boolean;
    created_at: string;
  },
  snapshot?: DestinationCatalogItem,
  enrichment?: DestinationEnrichment
): TripDestination {
  return {
    id: row.id,
    tripId: row.trip_id,
    destinationId: row.destination_id,
    destinationSnapshot: snapshot,
    destinationEnrichment: enrichment,
    addedByProfileId: row.added_by_profile_id,
    note: row.note,
    shortlist: row.shortlist,
    createdAt: row.created_at
  };
}

function mapDestinationEnrichment(row: {
  destination_id: string;
  short_summary: string;
  long_summary: string;
  vibe_tags: string[];
  top_activities: {
    title: string;
    description?: string;
    category?: "food" | "culture" | "outdoors" | "nightlife" | "wellness" | "shopping" | "scenic";
  }[];
  budget_tier: "value" | "balanced" | "premium";
  local_costs: {
    currency?: "USD";
    lodgingMidUsd?: number;
    foodMidUsd?: number;
    localTransportMidUsd?: number;
    activitiesMidUsd?: number;
    dailyTotalUsd?: number;
  };
  source: "heuristic" | "wikimedia" | "mixed_free_apis" | "llm_synthesized";
  coverage: "partial" | "complete";
  fetched_at: string;
  stale_at: string;
}): DestinationEnrichment {
  return {
    destinationId: row.destination_id,
    shortSummary: row.short_summary,
    longSummary: row.long_summary,
    vibeTags: row.vibe_tags ?? [],
    topActivities: row.top_activities ?? [],
    budgetTier: row.budget_tier,
    localCosts: {
      currency: row.local_costs?.currency ?? "USD",
      lodgingMidUsd: row.local_costs?.lodgingMidUsd ?? 0,
      foodMidUsd: row.local_costs?.foodMidUsd ?? 0,
      localTransportMidUsd: row.local_costs?.localTransportMidUsd ?? 0,
      activitiesMidUsd: row.local_costs?.activitiesMidUsd ?? 0,
      dailyTotalUsd: row.local_costs?.dailyTotalUsd ?? 0
    },
    source: row.source,
    coverage: row.coverage,
    fetchedAt: row.fetched_at,
    staleAt: row.stale_at
  };
}

function mapVote(row: {
  id: string;
  trip_id: string;
  profile_id: string;
  type: "destination" | "date_window";
  option_id: string;
  created_at: string;
}): Vote {
  return {
    id: row.id,
    tripId: row.trip_id,
    profileId: row.profile_id,
    type: row.type,
    optionId: row.option_id,
    createdAt: row.created_at
  };
}

function mapProfileAvailabilityWindow(row: {
  id: string;
  profile_id: string;
  label: string;
  start_month_day: string;
  end_month_day: string;
}): ProfileAvailabilityWindow {
  return {
    id: row.id,
    profileId: row.profile_id,
    label: row.label,
    startMonthDay: row.start_month_day,
    endMonthDay: row.end_month_day
  };
}

function mapDestinationRow(row: {
  id: string;
  city: string;
  country: string;
  country_code: string;
  lat: number;
  lon: number;
  image: string;
  tags: string[];
  best_for: string[];
  summary: string;
}): DestinationCatalogItem {
  return {
    id: row.id,
    city: row.city,
    country: row.country,
    countryCode: row.country_code,
    lat: row.lat,
    lon: row.lon,
    image: row.image,
    tags: row.tags ?? [],
    bestFor: row.best_for ?? [],
    summary: row.summary,
    source: "catalog"
  };
}

async function loadPersistedStateForUser(userId: string): Promise<PersistedState> {
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
        "id, creator_profile_id, title, group_name, summary, tentative_start, tentative_end, trip_duration, status, created_at, decided_at, final_date_option_ids"
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

  const [joinedTripsResult, allMembersResult, invitesResult, availRangesResult, tripDestsResult, votesResult, pawResult] = tripIds.length
    ? await Promise.all([
        supabase
          .from("trips")
          .select(
            "id, creator_profile_id, title, group_name, summary, tentative_start, tentative_end, trip_duration, status, created_at, decided_at, final_date_option_ids"
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
          .in("trip_id", tripIds),
        supabase
          .from("availability_ranges")
          .select("id, trip_id, profile_id, start_date, end_date")
          .in("trip_id", tripIds),
        supabase
          .from("trip_destinations")
          .select("id, trip_id, destination_id, added_by_profile_id, note, shortlist, created_at")
          .in("trip_id", tripIds),
        supabase
          .from("votes")
          .select("id, trip_id, profile_id, type, option_id, created_at")
          .in("trip_id", tripIds),
        supabase
          .from("profile_availability_windows")
          .select("id, profile_id, label, start_month_day, end_month_day")
          .eq("profile_id", userId)
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] },
       await supabase
         .from("profile_availability_windows")
         .select("id, profile_id, label, start_month_day, end_month_day")
         .eq("profile_id", userId)
      ];

  const tripById = new Map<string, Trip>();
  for (const trip of [...createdTrips, ...((joinedTripsResult.data ?? []) as never[]).map(mapTrip)]) {
    tripById.set(trip.id, trip);
  }

  const trips = sortTrips(Array.from(tripById.values()));
  const tripMembers = ((allMembersResult.data ?? []) as never[]).map(mapTripMember);
  const tripInvites = ((invitesResult.data ?? []) as never[]).map(mapTripInvite);
  const availabilityRanges = ((availRangesResult.data ?? []) as never[]).map(mapAvailabilityRange);
  const votesData = ((votesResult.data ?? []) as never[]).map(mapVote);
  const profileAvailabilityWindows = ((pawResult.data ?? []) as never[]).map(mapProfileAvailabilityWindow);

  // Fetch destination snapshots for trip_destinations
  const tripDestRows = (tripDestsResult.data ?? []) as never[];
  let tripDestinations: TripDestination[] = [];
  let destinationEnrichments: DestinationEnrichment[] = [];

  if (tripDestRows.length > 0) {
    const destinationIds = [...new Set(tripDestRows.map((r: { destination_id: string }) => r.destination_id))];
    const [destResult, enrichmentResult] = await Promise.all([
      supabase
        .from("destinations")
        .select("id, city, country, country_code, lat, lon, image, tags, best_for, summary")
        .in("id", destinationIds),
      supabase
        .from("destination_enrichments")
        .select(
          "destination_id, short_summary, long_summary, vibe_tags, top_activities, budget_tier, local_costs, source, coverage, fetched_at, stale_at"
        )
        .in("destination_id", destinationIds)
    ]);

    const destMap = new Map<string, DestinationCatalogItem>();
    for (const row of (destResult.data ?? []) as never[]) {
      const mapped = mapDestinationRow(row);
      destMap.set(mapped.id, mapped);
    }

    const enrichmentMap = new Map<string, DestinationEnrichment>();
    destinationEnrichments = ((enrichmentResult.data ?? []) as never[]).map(mapDestinationEnrichment);
    for (const enrichment of destinationEnrichments) {
      enrichmentMap.set(enrichment.destinationId, enrichment);
    }

    tripDestinations = tripDestRows.map((row: never) => {
      const r = row as { destination_id: string };
      const snapshot = destMap.get(r.destination_id) ?? destinationCatalog.find((d) => d.id === r.destination_id);
      return mapTripDestination(row, snapshot, enrichmentMap.get(r.destination_id));
    });
  }

  // Fetch related profiles
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
    tripInvites,
    profileAvailabilityWindows,
    availabilityRanges,
    tripDestinations,
    destinationEnrichments,
    votes: votesData
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

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [persistedState, setPersistedState] = useState<PersistedState>(emptyPersistedState);
  const configured = isSupabaseConfigured();
  const [isReady, setIsReady] = useState(!configured);
  const [isPending, setIsPending] = useState(false);
  const loadIdRef = useRef(0);

  async function refreshForUser(userId: string) {
    const nextState = await loadPersistedStateForUser(userId);
    setPersistedState(nextState);
  }

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
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
      async addProfileAvailabilityWindow(input) {
        if (!currentProfile) {
          return;
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          return;
        }

        await withPending(async () => {
          await supabase.from("profile_availability_windows").insert({
            id: createUuid("profilewin"),
            profile_id: currentProfile.id,
            label: input.label.trim(),
            start_month_day: input.startMonthDay,
            end_month_day: input.endMonthDay
          });

          await refreshForUser(currentProfile.id);
        });
      },
      async removeProfileAvailabilityWindow(windowId) {
        if (!currentProfile) {
          return;
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          return;
        }

        await withPending(async () => {
          await supabase
            .from("profile_availability_windows")
            .delete()
            .eq("id", windowId);

          await refreshForUser(currentProfile.id);
        });
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

        await withPending(async () => {
          const tripInsert = await supabase.from("trips").insert({
            id: tripId,
            creator_profile_id: currentProfile.id,
            title: input.title.trim(),
            group_name: input.groupName.trim(),
            summary: input.summary.trim(),
            tentative_start: input.tentativeStart,
            tentative_end: input.tentativeEnd,
            trip_duration: input.tripDuration ?? 7,
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

          await refreshForUser(currentProfile.id);
        });

        return tripId;
      },
      async updateTrip(tripId, input) {
        if (!currentProfile) {
          return;
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          return;
        }

        await withPending(async () => {
          await supabase
            .from("trips")
            .update({
              tentative_start: input.tentativeStart,
              tentative_end: input.tentativeEnd,
              trip_duration: input.tripDuration
            })
            .eq("id", tripId);

          await refreshForUser(currentProfile.id);
        });
      },
      async deleteTrip(tripId) {
        if (!currentProfile) {
          return;
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          return;
        }

        const trip = persistedState.trips.find((t) => t.id === tripId);
        if (!trip || trip.creatorProfileId !== currentProfile.id) {
          return;
        }

        await withPending(async () => {
          await supabase.from("trips").delete().eq("id", tripId);
          await refreshForUser(currentProfile.id);
        });
      },
      async updateTripStatus(tripId, status) {
        if (!currentProfile) {
          return;
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          return;
        }

        const trip = persistedState.trips.find((item) => item.id === tripId);
        if (!trip) {
          return;
        }

        if (status === "voting") {
          const finalDateOptions = getFinalDateOptionsForTrip(
            persistedState.trips,
            persistedState.availabilityRanges,
            persistedState.tripMembers,
            tripId
          );
          const shortlistedDestinations = persistedState.tripDestinations.filter(
            (entry) => entry.tripId === tripId && entry.shortlist
          );

          if (shortlistedDestinations.length === 0 || finalDateOptions.length === 0) {
            return;
          }
        }

        if (status === "decided" && trip.status !== "voting") {
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
      async setFinalDateOptions(tripId, optionIds) {
        if (!currentProfile) {
          return;
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          return;
        }

        await withPending(async () => {
          await supabase
            .from("trips")
            .update({ final_date_option_ids: optionIds })
            .eq("id", tripId);

          await refreshForUser(currentProfile.id);
        });
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
          type: "link" as const,
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
      async removeTripMember(tripId, profileId) {
        if (!currentProfile) {
          return;
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          return;
        }

        // Cannot remove yourself
        if (profileId === currentProfile.id) {
          return;
        }

        await withPending(async () => {
          await supabase
            .from("trip_members")
            .delete()
            .eq("trip_id", tripId)
            .eq("profile_id", profileId);

          await refreshForUser(currentProfile.id);
        });
      },
      async leaveTrip(tripId) {
        if (!currentProfile) {
          return;
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          return;
        }

        // Planners cannot leave their own trip
        const trip = persistedState.trips.find((t) => t.id === tripId);
        if (trip?.creatorProfileId === currentProfile.id) {
          return;
        }

        await withPending(async () => {
          // Remove votes by this member for this trip
          await supabase
            .from("votes")
            .delete()
            .eq("trip_id", tripId)
            .eq("profile_id", currentProfile.id);

          // Remove availability ranges by this member for this trip
          await supabase
            .from("availability_ranges")
            .delete()
            .eq("trip_id", tripId)
            .eq("profile_id", currentProfile.id);

          // Remove membership
          await supabase
            .from("trip_members")
            .delete()
            .eq("trip_id", tripId)
            .eq("profile_id", currentProfile.id);

          await refreshForUser(currentProfile.id);
        });
      },
      async addAvailability(tripId, startDate, endDate) {
        if (!currentProfile) {
          return;
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          return;
        }

        await withPending(async () => {
          await supabase.from("availability_ranges").insert({
            id: createUuid("range"),
            trip_id: tripId,
            profile_id: currentProfile.id,
            start_date: startDate,
            end_date: endDate
          });

          await refreshForUser(currentProfile.id);
        });
      },
      async removeAvailability(rangeId) {
        if (!currentProfile) {
          return;
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          return;
        }

        await withPending(async () => {
          await supabase
            .from("availability_ranges")
            .delete()
            .eq("id", rangeId);

          await refreshForUser(currentProfile.id);
        });
      },
      async addDestinationToTrip(tripId, destination, note) {
        if (!currentProfile) {
          return;
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          return;
        }

        await withPending(async () => {
          // Upsert into destinations catalog first (FK requirement)
          await supabase.from("destinations").upsert(
            {
              id: destination.id,
              city: destination.city,
              country: destination.country,
              country_code: destination.countryCode,
              lat: destination.lat,
              lon: destination.lon,
              image: destination.image,
              tags: destination.tags,
              best_for: destination.bestFor,
              summary: destination.summary
            },
            { onConflict: "id" }
          );

          // Insert trip_destination (ignore if already exists)
          const { error } = await supabase.from("trip_destinations").insert({
            id: createUuid("tripdest"),
            trip_id: tripId,
            destination_id: destination.id,
            added_by_profile_id: currentProfile.id,
            note: note.trim(),
            shortlist: false
          });

          // Ignore unique constraint violation (destination already added to trip)
          if (error && !error.code?.includes("23505")) {
            throw error;
          }

          await refreshForUser(currentProfile.id);
        });
      },
      async toggleDestinationShortlist(tripDestinationId) {
        if (!currentProfile) {
          return;
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          return;
        }

        const entry = persistedState.tripDestinations.find((td) => td.id === tripDestinationId);
        if (!entry) {
          return;
        }

        await withPending(async () => {
          await supabase
            .from("trip_destinations")
            .update({ shortlist: !entry.shortlist })
            .eq("id", tripDestinationId);

          await refreshForUser(currentProfile.id);
        });
      },
      async submitVote(tripId, type, optionId) {
        if (!currentProfile) {
          return;
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          return;
        }

        await withPending(async () => {
          // Use upsert with the unique constraint (trip_id, profile_id, type)
          const existingVote = persistedState.votes.find(
            (v) => v.tripId === tripId && v.profileId === currentProfile.id && v.type === type
          );

          if (existingVote) {
            await supabase
              .from("votes")
              .update({ option_id: optionId, created_at: new Date().toISOString() })
              .eq("id", existingVote.id);
          } else {
            await supabase.from("votes").insert({
              id: createUuid("vote"),
              trip_id: tripId,
              profile_id: currentProfile.id,
              type,
              option_id: optionId
            });
          }

          await refreshForUser(currentProfile.id);
        });
      },
      getTripById(tripId) {
        return persistedState.trips.find((item) => item.id === tripId);
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
          persistedState.availabilityRanges,
          persistedState.tripMembers,
          tripId
        );
      },
      getTripDestinations(tripId) {
        return persistedState.tripDestinations
          .filter((entry) => entry.tripId === tripId)
          .map((entry) => ({
            ...entry,
            destination:
              entry.destinationSnapshot ??
              destinationCatalog.find((item) => item.id === entry.destinationId),
            enrichment: entry.destinationEnrichment
          }));
      },
      getTripAvailability(tripId) {
        return persistedState.availabilityRanges.filter((range) => range.tripId === tripId);
      },
      getProfileAvailabilityWindows(profileId) {
        const targetProfileId = profileId ?? currentProfile?.id;
        if (!targetProfileId) {
          return [];
        }

        return persistedState.profileAvailabilityWindows.filter(
          (window) => window.profileId === targetProfileId
        );
      },
      getSuggestedProfileAvailability(tripId, profileId) {
        const trip = persistedState.trips.find((item) => item.id === tripId);
        const targetProfileId = profileId ?? currentProfile?.id;
        if (!trip || !targetProfileId) {
          return [];
        }

        return persistedState.profileAvailabilityWindows
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
        const ranges = persistedState.availabilityRanges.filter((item) => item.tripId === tripId);
        return computeDateWindowOptions(trip.tentativeStart, trip.tentativeEnd, members, ranges, trip.tripDuration);
      },
      getVoteForCurrentUser(tripId, type) {
        if (!currentProfile) {
          return undefined;
        }

        return persistedState.votes.find(
          (vote) =>
            vote.tripId === tripId && vote.profileId === currentProfile.id && vote.type === type
        );
      },
      getVotesForTrip(tripId, type) {
        return persistedState.votes.filter(
          (vote) => vote.tripId === tripId && vote.type === type
        );
      },
      getVisibleTrips() {
        if (!currentProfile) {
          return { created: [], joined: [] };
        }

        const created = sortTrips(
          persistedState.trips.filter((trip) => trip.creatorProfileId === currentProfile.id)
        );
        const joinedTripIds = new Set(
          persistedState.tripMembers
            .filter((member) => member.profileId === currentProfile.id)
            .map((member) => member.tripId)
        );
        const joined = sortTrips(
          persistedState.trips.filter(
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
              "id, creator_profile_id, title, group_name, summary, tentative_start, tentative_end, trip_duration, status, created_at, decided_at, final_date_option_ids"
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
  }, [configured, currentProfile, isPending, isReady, persistedState]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

function getFinalDateOptionsForTrip(
  trips: Trip[],
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
  const options = computeDateWindowOptions(trip.tentativeStart, trip.tentativeEnd, members, ranges, trip.tripDuration);
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
