export type TripStatus =
  | "draft"
  | "collecting_members"
  | "planning"
  | "voting"
  | "decided";

export type MemberRole = "planner" | "member";
export type InviteType = "email" | "link";
export type VoteType = "destination" | "date_window";
export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

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
  creatorProfileId: string;
  finalDateOptionIds: string[];
  status: TripStatus;
  createdAt: string;
  decidedAt?: string;
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
  type: InviteType;
  token: string;
  email?: string;
  createdAt: string;
  expiresAt?: string;
  acceptedAt?: string;
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
}

export interface TripDestination {
  id: string;
  tripId: string;
  destinationId: string;
  destinationSnapshot?: DestinationCatalogItem;
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
  votes: Vote[];
}

export interface DateWindowOption {
  id: string;
  startDate: string;
  endDate: string;
  coverage: number;
}
