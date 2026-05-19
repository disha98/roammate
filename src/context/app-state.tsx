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
import {
  createUuid,
  createInviteToken,
  getInviteStatus,
  sortTrips,
  getFinalDateOptionsForTrip,
  mapWindowToTripDates
} from "./helpers";
import {
  type PersistedState,
  emptyPersistedState,
  loadPersistedStateForUser,
  ensureProfile
} from "./loaders";
import {
  mapProfile,
  mapTrip,
  mapTripMember,
  mapTripInvite,
  mapAvailabilityRange,
  mapTripDestination,
  mapDestinationEnrichment,
  mapVote,
  mapProfileAvailabilityWindow,
  mapDestinationRow
} from "./mappers";

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
  lockTripDecision: (
    tripId: string,
    input: { destinationId: string; dateOptionId: string }
  ) => Promise<void>;
  reopenTripDecision: (tripId: string) => Promise<void>;
  setFinalDateOptions: (tripId: string, optionIds: string[]) => Promise<void>;
  createInviteLink: (tripId: string) => Promise<TripInvite>;
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

        if (status === "decided") {
          return;
        }

        await withPending(async () => {
          await supabase
            .from("trips")
            .update({
              status,
              decided_at: status === "voting" ? null : trip.decidedAt ?? null
            })
            .eq("id", tripId);

          setPersistedState((prev) => ({
            ...prev,
            trips: prev.trips.map((t) =>
              t.id === tripId
                ? { ...t, status, decidedAt: status === "voting" ? undefined : t.decidedAt }
                : t
            )
          }));
        });
      },
      async lockTripDecision(tripId, input) {
        if (!currentProfile) {
          return;
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          return;
        }

        const trip = persistedState.trips.find((item) => item.id === tripId);
        if (!trip || trip.creatorProfileId !== currentProfile.id || trip.status !== "voting") {
          return;
        }

        const dateOption = getFinalDateOptionsForTrip(
          persistedState.trips,
          persistedState.availabilityRanges,
          persistedState.tripMembers,
          tripId
        ).find((option) => option.id === input.dateOptionId);
        const destinationEntry = persistedState.tripDestinations.find(
          (entry) =>
            entry.tripId === tripId &&
            entry.destinationId === input.destinationId &&
            entry.shortlist &&
            entry.destinationSnapshot
        );

        if (!dateOption || !destinationEntry?.destinationSnapshot) {
          return;
        }

        await withPending(async () => {
          await supabase
            .from("trips")
            .update({
              status: "decided",
              decided_at: new Date().toISOString(),
              final_destination_id: input.destinationId,
              final_destination_snapshot: destinationEntry.destinationSnapshot,
              final_date_start: dateOption.startDate,
              final_date_end: dateOption.endDate,
              final_locked_by_profile_id: currentProfile.id
            })
            .eq("id", tripId);

          await refreshForUser(currentProfile.id);
        });
      },
      async reopenTripDecision(tripId) {
        if (!currentProfile) {
          return;
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          return;
        }

        const trip = persistedState.trips.find((item) => item.id === tripId);
        if (!trip || trip.creatorProfileId !== currentProfile.id || trip.status !== "decided") {
          return;
        }

        await withPending(async () => {
          await supabase
            .from("trips")
            .update({ status: "voting" })
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

          setPersistedState((prev) => ({
            ...prev,
            trips: prev.trips.map((t) =>
              t.id === tripId ? { ...t, finalDateOptionIds: optionIds } : t
            )
          }));
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
            token,
            created_at: createdAt,
            expires_at: expiresAt
          });

          await refreshForUser(currentProfile.id);
        });

        return {
          id: inviteId,
          tripId,
          token,
          createdAt,
          expiresAt
        };
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
            .rpc("lookup_invite_by_token", { invite_token: token })
            .maybeSingle();

          if (!inviteResult.data) {
            return undefined;
          }

          const invite = mapTripInvite(inviteResult.data as {
            id: string; trip_id: string; token: string;
            created_at: string; expires_at: string | null; revoked_at: string | null;
          });
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
          const rangeId = createUuid("range");
          await supabase.from("availability_ranges").insert({
            id: rangeId,
            trip_id: tripId,
            profile_id: currentProfile.id,
            start_date: startDate,
            end_date: endDate
          });

          setPersistedState((prev) => ({
            ...prev,
            availabilityRanges: [
              ...prev.availabilityRanges,
              {
                id: rangeId,
                tripId,
                profileId: currentProfile.id,
                startDate,
                endDate
              }
            ]
          }));
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

          setPersistedState((prev) => ({
            ...prev,
            availabilityRanges: prev.availabilityRanges.filter((r) => r.id !== rangeId)
          }));
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

          setPersistedState((prev) => ({
            ...prev,
            tripDestinations: prev.tripDestinations.map((td) =>
              td.id === tripDestinationId ? { ...td, shortlist: !td.shortlist } : td
            )
          }));
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

          const now = new Date().toISOString();
          const voteId = existingVote?.id ?? createUuid("vote");

          if (existingVote) {
            await supabase
              .from("votes")
              .update({ option_id: optionId, created_at: now })
              .eq("id", existingVote.id);
          } else {
            await supabase.from("votes").insert({
              id: voteId,
              trip_id: tripId,
              profile_id: currentProfile.id,
              type,
              option_id: optionId
            });
          }

          setPersistedState((prev) => {
            const withoutOld = prev.votes.filter(
              (v) =>
                !(v.tripId === tripId && v.profileId === currentProfile.id && v.type === type)
            );
            return {
              ...prev,
              votes: [
                ...withoutOld,
                {
                  id: voteId,
                  tripId,
                  profileId: currentProfile.id,
                  type,
                  optionId,
                  createdAt: now
                }
              ]
            };
          });
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
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
          .rpc("lookup_invite_by_token", { invite_token: token })
          .maybeSingle();

        if (!inviteResult.data) {
          return { invite: undefined, trip: undefined, planner: undefined, memberCount: 0 };
        }

        const invite = mapTripInvite(inviteResult.data as {
          id: string; trip_id: string; token: string;
          created_at: string; expires_at: string | null; revoked_at: string | null;
        });
        const [tripResult, memberCountResult] = await Promise.all([
          supabase
            .from("trips")
            .select(
              "id, creator_profile_id, title, group_name, summary, tentative_start, tentative_end, trip_duration, status, created_at, decided_at, final_date_option_ids, final_destination_id, final_destination_snapshot, final_date_start, final_date_end, final_locked_by_profile_id"
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

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return context;
}

export { destinationCatalog };
