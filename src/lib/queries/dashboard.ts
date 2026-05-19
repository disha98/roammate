import type { SupabaseClient } from "@supabase/supabase-js";
import { mapProfile, mapTrip } from "@/context/mappers";
import type { Profile, Trip } from "@/lib/types";

const TRIP_COLUMNS =
  "id, creator_profile_id, title, group_name, summary, tentative_start, tentative_end, trip_duration, status, created_at, decided_at, final_date_option_ids, final_destination_id, final_destination_snapshot, final_date_start, final_date_end, final_locked_by_profile_id";

export interface DashboardData {
  profile: Profile;
  created: Trip[];
  joined: Trip[];
  memberCounts: Record<string, number>;
  availabilityProfileIds: Record<string, string[]>;
}

export async function getDashboardData(
  supabase: SupabaseClient,
  userId: string
): Promise<DashboardData | null> {
  const profileResult = await supabase
    .from("profiles")
    .select("id, email, display_name, home_city, passport, photo_url, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profileResult.data) return null;
  const profile = mapProfile(profileResult.data);

  // Fetch all memberships for this user to find their trips
  const membershipsResult = await supabase
    .from("trip_members")
    .select("trip_id")
    .eq("profile_id", userId);

  const tripIds = (membershipsResult.data ?? []).map((m) => m.trip_id);

  if (tripIds.length === 0) {
    return { profile, created: [], joined: [], memberCounts: {}, availabilityProfileIds: {} };
  }

  // Fetch all trips and member counts in parallel
  const [tripsResult, allMembersResult, availabilityResult] = await Promise.all([
    supabase.from("trips").select(TRIP_COLUMNS).in("id", tripIds),
    supabase.from("trip_members").select("trip_id, id").in("trip_id", tripIds),
    supabase
      .from("availability_ranges")
      .select("trip_id, profile_id")
      .in("trip_id", tripIds)
  ]);

  const trips = (tripsResult.data ?? []).map(mapTrip);
  const sorted = [...trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const created = sorted.filter((t) => t.creatorProfileId === userId);
  const joined = sorted.filter((t) => t.creatorProfileId !== userId);

  const memberCounts: Record<string, number> = {};
  for (const m of allMembersResult.data ?? []) {
    memberCounts[m.trip_id] = (memberCounts[m.trip_id] ?? 0) + 1;
  }

  const availabilityProfileIds: Record<string, string[]> = {};
  for (const r of availabilityResult.data ?? []) {
    if (!availabilityProfileIds[r.trip_id]) {
      availabilityProfileIds[r.trip_id] = [];
    }
    if (!availabilityProfileIds[r.trip_id].includes(r.profile_id)) {
      availabilityProfileIds[r.trip_id].push(r.profile_id);
    }
  }

  return { profile, created, joined, memberCounts, availabilityProfileIds };
}
