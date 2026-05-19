import {
  AppState,
  Profile,
  ProfileAvailabilityWindow,
  Trip,
  TripDestination,
  TripInvite,
  TripMember,
  Vote
} from "@/lib/types";
import { createId } from "@/lib/utils";

const now = new Date().toISOString();

const profiles: Profile[] = [
  {
    id: "profile_planner",
    email: "maya@example.com",
    displayName: "Maya",
    homeCity: "Chicago",
    passport: "US",
    photoUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
    createdAt: now
  },
  {
    id: "profile_ana",
    email: "ana@example.com",
    displayName: "Ana",
    homeCity: "London",
    passport: "GB",
    photoUrl:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=600&q=80",
    createdAt: now
  },
  {
    id: "profile_rohan",
    email: "rohan@example.com",
    displayName: "Rohan",
    homeCity: "Bengaluru",
    passport: "IN",
    photoUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
    createdAt: now
  }
];

const profileAvailabilityWindows: ProfileAvailabilityWindow[] = [
  {
    id: createId("profilewin"),
    profileId: "profile_planner",
    label: "Late summer travel window",
    startMonthDay: "08-15",
    endMonthDay: "09-05"
  },
  {
    id: createId("profilewin"),
    profileId: "profile_ana",
    label: "January reset",
    startMonthDay: "01-05",
    endMonthDay: "01-25"
  }
];

const trips: Trip[] = [
  {
    id: "trip_iberia",
    title: "Late Summer Escape",
    groupName: "MBA Friends",
    summary: "A one-week break that feels celebratory but still easy to coordinate from three continents.",
    tentativeStart: "2026-08-20",
    tentativeEnd: "2026-08-29",
    tripDuration: 7,
    creatorProfileId: "profile_planner",
    finalDateOptionIds: [],
    status: "planning",
    createdAt: now
  },
  {
    id: "trip_winter",
    title: "Warm January Reset",
    groupName: "Cousins",
    summary: "A low-friction winter getaway with sun, shared villa energy, and room for mixed budgets.",
    tentativeStart: "2027-01-10",
    tentativeEnd: "2027-01-18",
    tripDuration: 7,
    creatorProfileId: "profile_ana",
    finalDateOptionIds: [],
    status: "collecting_members",
    createdAt: now
  }
];

const tripMembers: TripMember[] = [
  {
    id: createId("member"),
    tripId: "trip_iberia",
    profileId: "profile_planner",
    role: "planner",
    joinedAt: now
  },
  {
    id: createId("member"),
    tripId: "trip_iberia",
    profileId: "profile_ana",
    role: "member",
    joinedAt: now
  },
  {
    id: createId("member"),
    tripId: "trip_iberia",
    profileId: "profile_rohan",
    role: "member",
    joinedAt: now
  },
  {
    id: createId("member"),
    tripId: "trip_winter",
    profileId: "profile_ana",
    role: "planner",
    joinedAt: now
  },
  {
    id: createId("member"),
    tripId: "trip_winter",
    profileId: "profile_planner",
    role: "member",
    joinedAt: now
  }
];

const tripInvites: TripInvite[] = [
  {
    id: createId("invite"),
    tripId: "trip_iberia",
    token: "demo-invite-token",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: now
  }
];

const tripDestinations: TripDestination[] = [
  {
    id: createId("tripdest"),
    tripId: "trip_iberia",
    destinationId: "lisbon",
    addedByProfileId: "profile_planner",
    note: "Feels easy on logistics and has a clear social vibe.",
    shortlist: true,
    createdAt: now
  },
  {
    id: createId("tripdest"),
    tripId: "trip_iberia",
    destinationId: "cape-town",
    addedByProfileId: "profile_ana",
    note: "Ambitious, but the scenery and mixed itinerary are strong.",
    shortlist: false,
    createdAt: now
  },
  {
    id: createId("tripdest"),
    tripId: "trip_iberia",
    destinationId: "mexico-city",
    addedByProfileId: "profile_rohan",
    note: "Could work well for a shorter planning horizon.",
    shortlist: true,
    createdAt: now
  }
];

const votes: Vote[] = [
  {
    id: createId("vote"),
    tripId: "trip_iberia",
    profileId: "profile_planner",
    type: "destination",
    optionId: "lisbon",
    createdAt: now
  }
];

export const initialAppState: AppState = {
  profiles,
  currentProfileId: "profile_planner",
  trips,
  tripMembers,
  tripInvites,
  profileAvailabilityWindows,
  availabilityRanges: [
    {
      id: createId("range"),
      tripId: "trip_iberia",
      profileId: "profile_planner",
      startDate: "2026-08-20",
      endDate: "2026-08-25"
    },
    {
      id: createId("range"),
      tripId: "trip_iberia",
      profileId: "profile_ana",
      startDate: "2026-08-22",
      endDate: "2026-08-29"
    },
    {
      id: createId("range"),
      tripId: "trip_iberia",
      profileId: "profile_rohan",
      startDate: "2026-08-21",
      endDate: "2026-08-26"
    }
  ],
  tripDestinations,
  destinationEnrichments: [],
  votes
};
