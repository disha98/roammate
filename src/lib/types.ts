export type TripStatus =
  | "draft"
  | "collecting_members"
  | "planning"
  | "voting"
  | "decided";

export type MemberRole = "planner" | "member";
export type VoteType = "destination" | "date_window";
export type InviteStatus = "pending" | "expired" | "revoked";

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  homeCity: string;
  passport: string;
  photoUrl?: string;
  createdAt: string;
}

export interface ProfileAvailabilityWindow {
  id: string;
  profileId: string;
  label: string;
  startMonthDay: string;
  endMonthDay: string;
}

export interface Trip {
  id: string;
  title: string;
  groupName: string;
  summary: string;
  tentativeStart: string;
  tentativeEnd: string;
  tripDuration: number;
  creatorProfileId: string;
  finalDateOptionIds: string[];
  status: TripStatus;
  createdAt: string;
  decidedAt?: string;
  finalDestinationId?: string;
  finalDestinationSnapshot?: DestinationCatalogItem;
  finalDateStart?: string;
  finalDateEnd?: string;
  finalLockedByProfileId?: string;
}

export interface TripMember {
  id: string;
  tripId: string;
  profileId: string;
  role: MemberRole;
  joinedAt: string;
}

export interface TripInvite {
  id: string;
  tripId: string;
  token: string;
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
}

export interface AvailabilityRange {
  id: string;
  tripId: string;
  profileId: string;
  startDate: string;
  endDate: string;
}

export interface DestinationCatalogItem {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  region?: string;
  lat: number;
  lon: number;
  image: string;
  tags: string[];
  bestFor: string[];
  summary: string;
  population?: number;
  source?: "catalog" | "search";
  imageSource?: "catalog" | "provider" | "placeholder";
}

export interface DestinationActivity {
  title: string;
  description?: string;
  category?: "food" | "culture" | "outdoors" | "nightlife" | "wellness" | "shopping" | "scenic";
}

export interface DestinationLocalCosts {
  currency: "USD";
  lodgingMidUsd: number;
  foodMidUsd: number;
  localTransportMidUsd: number;
  activitiesMidUsd: number;
  dailyTotalUsd: number;
}

export interface DestinationEnrichment {
  destinationId: string;
  shortSummary: string;
  longSummary: string;
  vibeTags: string[];
  topActivities: DestinationActivity[];
  budgetTier: "value" | "balanced" | "premium";
  localCosts: DestinationLocalCosts;
  source: "heuristic" | "wikimedia" | "mixed_free_apis" | "llm_synthesized";
  coverage: "partial" | "complete";
  fetchedAt: string;
  staleAt: string;
}

export interface TripDestination {
  id: string;
  tripId: string;
  destinationId: string;
  destinationSnapshot?: DestinationCatalogItem;
  destinationEnrichment?: DestinationEnrichment;
  addedByProfileId: string;
  note: string;
  shortlist: boolean;
  createdAt: string;
}

export interface Vote {
  id: string;
  tripId: string;
  profileId: string;
  type: VoteType;
  optionId: string;
  createdAt: string;
}

export interface AppState {
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

export interface DateWindowOption {
  id: string;
  startDate: string;
  endDate: string;
  coverage: number;
}

export interface RecommendedDestination {
  destination: DestinationCatalogItem;
  reasons: string[];
  weatherSummary: string;
  weatherScore: number;
  visaSummary: string;
  visaFreeMemberCount: number;
  knownPassportCount: number;
}
