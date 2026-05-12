import type {
  DestinationActivity,
  DestinationCatalogItem,
  DestinationEnrichment,
  DestinationLocalCosts
} from "@/lib/types";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const GROQ_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-20b";

const activityCatalog: Record<string, DestinationActivity> = {
  Food: {
    title: "Food crawl",
    description: "Build one flexible evening around local specialties, a few signature spots, and a late dinner.",
    category: "food"
  },
  Culture: {
    title: "Culture loop",
    description: "Use one half-day for a landmark, a market or museum stop, and a slower neighborhood walk.",
    category: "culture"
  },
  Beach: {
    title: "Beach day",
    description: "Keep one low-planning day reserved for shoreline time, sunset, and a simple dinner plan.",
    category: "scenic"
  },
  Scenic: {
    title: "Viewpoint circuit",
    description: "Anchor a day around waterfronts, skyline viewpoints, or a scenic district walk.",
    category: "scenic"
  },
  Adventure: {
    title: "Active outing",
    description: "Reserve time for one hike, boat trip, or higher-energy excursion that gives the trip shape.",
    category: "outdoors"
  },
  Nightlife: {
    title: "Late-night block",
    description: "Choose one district for drinks, music, and a coordinated late dinner so the group stays together.",
    category: "nightlife"
  },
  Wellness: {
    title: "Recharge block",
    description: "Balance the itinerary with one slower morning, spa visit, or pool day to keep the trip easy.",
    category: "wellness"
  },
  Coastal: {
    title: "Waterfront afternoon",
    description: "Use the harbor or shoreline as the easy regroup point when the group wants a lighter day.",
    category: "scenic"
  },
  Heritage: {
    title: "Historic core walk",
    description: "Plan one route through the older part of the city for architecture, slower wandering, and context.",
    category: "culture"
  },
  Romantic: {
    title: "Golden-hour dinner",
    description: "Save one evening for the strongest view, a slower dinner, and the city’s more atmospheric side.",
    category: "scenic"
  },
  Nature: {
    title: "Nature reset",
    description: "Pair the city with a nearby outdoors stop or day trip to keep the itinerary from feeling dense.",
    category: "outdoors"
  },
  Relaxed: {
    title: "Low-friction day",
    description: "Leave room for cafés, short walks, and open time so the group can split and recombine easily.",
    category: "wellness"
  },
  "City Break": {
    title: "Neighborhood circuit",
    description: "Break the trip into a few distinct districts so the group can vary pace without losing flow.",
    category: "culture"
  }
};

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function stripMarkup(text: string) {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentences(text: string, count = 2) {
  return stripMarkup(text)
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, count)
    .join(" ");
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function getTitleCandidates(destination: DestinationCatalogItem) {
  const candidates = [
    destination.city,
    `${destination.city} City`,
    destination.region ? `${destination.city}, ${destination.region}` : "",
    `${destination.city}, ${destination.country}`,
    `${destination.city} travel guide`
  ];

  return uniqueStrings(candidates.map((candidate) => candidate.trim()));
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 * 60 * 24 }
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}`);
  }

  return (await response.json()) as T;
}

function looksAmbiguous(text: string) {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("may refer to") ||
    normalized.includes("there is more than one place called") ||
    normalized.includes("disambiguation") ||
    normalized.includes("=== united states of america ===") ||
    normalized.includes("== other places ==")
  );
}

function scoreResolvedTitle(title: string, destination: DestinationCatalogItem) {
  const normalizedTitle = title.toLowerCase();
  const normalizedCity = destination.city.toLowerCase();
  const normalizedCountry = destination.country.toLowerCase();
  const normalizedRegion = destination.region?.toLowerCase() ?? "";

  let score = 0;
  if (normalizedTitle === normalizedCity) {
    score += 6;
  }
  if (normalizedTitle.includes(normalizedCity)) {
    score += 4;
  }
  if (normalizedRegion && normalizedTitle.includes(normalizedRegion)) {
    score += 3;
  }
  if (normalizedTitle.includes(normalizedCountry)) {
    score += 2;
  }
  if (normalizedTitle.endsWith("city")) {
    score += 1;
  }

  return score;
}

async function resolveNearbyWikiTitle(
  wikiBaseUrl: string,
  destination: DestinationCatalogItem
) {
  const geosearchUrl = new URL(wikiBaseUrl);
  geosearchUrl.searchParams.set("action", "query");
  geosearchUrl.searchParams.set("list", "geosearch");
  geosearchUrl.searchParams.set("gscoord", `${destination.lat}|${destination.lon}`);
  geosearchUrl.searchParams.set("gsradius", "15000");
  geosearchUrl.searchParams.set("gslimit", "10");
  geosearchUrl.searchParams.set("format", "json");
  geosearchUrl.searchParams.set("formatversion", "2");
  geosearchUrl.searchParams.set("origin", "*");

  try {
    const payload = await fetchJson<{
      query?: {
        geosearch?: {
          title: string;
        }[];
      };
    }>(geosearchUrl.toString());

    const match = (payload.query?.geosearch ?? [])
      .sort(
        (left, right) =>
          scoreResolvedTitle(right.title, destination) - scoreResolvedTitle(left.title, destination)
      )
      .find((candidate) => scoreResolvedTitle(candidate.title, destination) > 0);

    return match?.title ?? null;
  } catch {
    return null;
  }
}

async function fetchWikipediaSummary(destination: DestinationCatalogItem) {
  const titleCandidates = uniqueStrings([
    (await resolveNearbyWikiTitle("https://en.wikipedia.org/w/api.php", destination)) ?? "",
    ...getTitleCandidates(destination)
  ]);

  for (const title of titleCandidates) {
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("prop", "extracts|description|pageprops");
    url.searchParams.set("titles", title);
    url.searchParams.set("exintro", "1");
    url.searchParams.set("explaintext", "1");
    url.searchParams.set("redirects", "1");
    url.searchParams.set("format", "json");
    url.searchParams.set("formatversion", "2");
    url.searchParams.set("origin", "*");

    try {
      const payload = await fetchJson<{
        query?: {
          pages?: {
            missing?: boolean;
            title?: string;
            extract?: string;
            description?: string;
            pageprops?: {
              disambiguation?: string;
            };
          }[];
        };
      }>(url.toString());

      const page = payload.query?.pages?.find((candidate) => !candidate.missing && candidate.extract);
      if (page?.extract && !page.pageprops?.disambiguation && !looksAmbiguous(page.extract)) {
        return {
          title: page.title ?? title,
          shortSummary: firstSentences(page.extract, 1),
          longSummary: firstSentences(page.extract, 3)
        };
      }
    } catch {
      // Continue to the next candidate title.
    }
  }

  return null;
}

async function resolveWikivoyageTitle(destination: DestinationCatalogItem) {
  const titleCandidates = uniqueStrings([
    (await resolveNearbyWikiTitle("https://en.wikivoyage.org/w/api.php", destination)) ?? "",
    ...getTitleCandidates(destination)
  ]);

  for (const title of titleCandidates) {
    const url = new URL("https://en.wikivoyage.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("titles", title);
    url.searchParams.set("redirects", "1");
    url.searchParams.set("format", "json");
    url.searchParams.set("formatversion", "2");
    url.searchParams.set("origin", "*");

    try {
      const payload = await fetchJson<{
        query?: {
          pages?: {
            missing?: boolean;
            title?: string;
          }[];
        };
      }>(url.toString());

      const page = payload.query?.pages?.find((candidate) => !candidate.missing && candidate.title);
      if (page?.title) {
        return page.title;
      }
    } catch {
      // Continue to the next candidate title.
    }
  }

  return null;
}

async function fetchWikivoyageGuide(destination: DestinationCatalogItem) {
  const title = await resolveWikivoyageTitle(destination);
  if (!title) {
    return null;
  }

  const extractUrl = new URL("https://en.wikivoyage.org/w/api.php");
  extractUrl.searchParams.set("action", "query");
  extractUrl.searchParams.set("prop", "extracts");
  extractUrl.searchParams.set("titles", title);
  extractUrl.searchParams.set("explaintext", "1");
  extractUrl.searchParams.set("redirects", "1");
  extractUrl.searchParams.set("format", "json");
  extractUrl.searchParams.set("formatversion", "2");
  extractUrl.searchParams.set("origin", "*");

  const sectionsUrl = new URL("https://en.wikivoyage.org/w/api.php");
  sectionsUrl.searchParams.set("action", "parse");
  sectionsUrl.searchParams.set("page", title);
  sectionsUrl.searchParams.set("prop", "sections");
  sectionsUrl.searchParams.set("format", "json");
  sectionsUrl.searchParams.set("formatversion", "2");
  sectionsUrl.searchParams.set("origin", "*");

  try {
    const [extractPayload, sectionsPayload] = await Promise.all([
      fetchJson<{
        query?: {
          pages?: {
            missing?: boolean;
            extract?: string;
          }[];
        };
      }>(extractUrl.toString()),
      fetchJson<{
        parse?: {
          sections?: {
            line: string;
          }[];
        };
      }>(sectionsUrl.toString())
    ]);

    const extract = extractPayload.query?.pages?.find((page) => !page.missing)?.extract ?? "";
    const sectionLines = (sectionsPayload.parse?.sections ?? []).map((section) => section.line);
    if (looksAmbiguous(extract)) {
      return null;
    }

    return {
      longSummary: firstSentences(extract, 4),
      guideText: stripMarkup(extract),
      sectionLines
    };
  } catch {
    return null;
  }
}

async function fetchWorldBankCountryMeta(destination: DestinationCatalogItem) {
  const url = new URL(`https://api.worldbank.org/v2/country/${destination.countryCode.toLowerCase()}`);
  url.searchParams.set("format", "json");

  try {
    const payload = await fetchJson<
      [
        unknown,
        {
          incomeLevel?: { id?: string; value?: string };
          region?: { value?: string };
          capitalCity?: string;
        }[]
      ]
    >(url.toString());

    const country = payload[1]?.[0];
    if (!country) {
      return null;
    }

    return {
      incomeLevelId: country.incomeLevel?.id ?? "",
      incomeLevelName: country.incomeLevel?.value ?? "",
      regionName: country.region?.value ?? "",
      capitalCity: country.capitalCity ?? ""
    };
  } catch {
    return null;
  }
}

function getBudgetTierFromIncomeLevel(
  incomeLevelId: string
): DestinationEnrichment["budgetTier"] {
  if (incomeLevelId === "HIC") {
    return "premium";
  }

  if (incomeLevelId === "UMC") {
    return "balanced";
  }

  if (incomeLevelId === "LMC" || incomeLevelId === "LIC") {
    return "value";
  }

  return "balanced";
}

function getBaseLocalCosts(
  tier: DestinationEnrichment["budgetTier"]
): DestinationLocalCosts {
  if (tier === "value") {
    return {
      currency: "USD",
      lodgingMidUsd: 78,
      foodMidUsd: 26,
      localTransportMidUsd: 12,
      activitiesMidUsd: 24,
      dailyTotalUsd: 140
    };
  }

  if (tier === "premium") {
    return {
      currency: "USD",
      lodgingMidUsd: 220,
      foodMidUsd: 74,
      localTransportMidUsd: 28,
      activitiesMidUsd: 82,
      dailyTotalUsd: 404
    };
  }

  return {
    currency: "USD",
    lodgingMidUsd: 138,
    foodMidUsd: 46,
    localTransportMidUsd: 18,
    activitiesMidUsd: 42,
    dailyTotalUsd: 244
  };
}

function adjustCostsForCity(
  base: DestinationLocalCosts,
  destination: DestinationCatalogItem
) {
  let multiplier = 1;

  if ((destination.population ?? 0) > 8000000) {
    multiplier += 0.12;
  } else if ((destination.population ?? 0) > 3000000) {
    multiplier += 0.06;
  }

  if (destination.tags.includes("Nightlife")) {
    multiplier += 0.05;
  }

  if (destination.tags.includes("Scenic") || destination.tags.includes("Adventure")) {
    multiplier += 0.04;
  }

  const round = (value: number) => Math.round(value * multiplier);
  return {
    currency: "USD" as const,
    lodgingMidUsd: round(base.lodgingMidUsd),
    foodMidUsd: round(base.foodMidUsd),
    localTransportMidUsd: round(base.localTransportMidUsd),
    activitiesMidUsd: round(base.activitiesMidUsd),
    dailyTotalUsd: round(base.dailyTotalUsd)
  };
}

function deriveVibeTags(destination: DestinationCatalogItem, guideSections: string[]) {
  const vibeTags = new Set<string>(destination.tags);

  if ((destination.population ?? 0) > 5000000) {
    vibeTags.add("Big City Energy");
  }

  if (guideSections.some((line) => /eat|drink/i.test(line))) {
    vibeTags.add("Food Forward");
  }

  if (guideSections.some((line) => /see|do|understand/i.test(line))) {
    vibeTags.add("Easy To Fill An Itinerary");
  }

  if (destination.tags.includes("Nightlife")) {
    vibeTags.add("Late Nights");
  }

  if (destination.tags.includes("Scenic") || destination.tags.includes("Coastal")) {
    vibeTags.add("Photo Friendly");
  }

  return Array.from(vibeTags).slice(0, 6);
}

async function synthesizeWithGroq(input: {
  destination: DestinationCatalogItem;
  wikipediaSummary: { shortSummary: string; longSummary: string } | null;
  wikivoyageGuide: { longSummary: string; guideText: string; sectionLines: string[] } | null;
}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("[destination-intelligence] GROQ_API_KEY is not set — skipping LLM synthesis");
    return null;
  }

  const systemPrompt =
    "Extract destination intelligence as JSON. Be concise. shortSummary: 1 sentence. longSummary: 2 sentences. vibeTags: 3-5 tags (2-3 words each). topActivities: 3 items, short title + 1-sentence description. City-specific facts only.";

  // Build a compact prompt with only what the LLM needs
  const guide = input.wikivoyageGuide?.guideText.slice(0, 1500) ?? "";
  const wiki = input.wikipediaSummary?.shortSummary ?? "";
  const userPrompt = `City: ${input.destination.city}, ${input.destination.country}\n${wiki ? `Wiki: ${wiki}\n` : ""}${guide ? `Guide: ${guide}` : ""}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "destination_enrichment",
          schema: {
            type: "object",
            properties: {
              shortSummary: { type: "string" },
              longSummary: { type: "string" },
              vibeTags: {
                type: "array",
                items: { type: "string" }
              },
              topActivities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    category: {
                      type: "string",
                      enum: ["food", "culture", "outdoors", "nightlife", "wellness", "shopping", "scenic"]
                    }
                  },
                  required: ["title", "description", "category"]
                }
              }
            },
            required: ["shortSummary", "longSummary", "vibeTags", "topActivities"]
          }
        }
      }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error(`[destination-intelligence] Groq API error ${response.status}: ${errorBody}`);
    return null;
  }

  const payload = (await response.json()) as {
    choices?: {
      message?: { content?: string };
    }[];
  };

  const text = payload.choices?.[0]?.message?.content;
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as {
      shortSummary: string;
      longSummary: string;
      vibeTags: string[];
      topActivities: DestinationActivity[];
    };
  } catch {
    return null;
  }
}

function deriveActivitiesFromSections(
  sectionLines: string[]
): DestinationActivity[] {
  const preferredSections = ["See", "Do", "Eat", "Drink", "Buy", "Sleep"];

  const mapped = preferredSections.flatMap((sectionName) => {
    const match = sectionLines.find((line) => line.toLowerCase() === sectionName.toLowerCase());
    if (!match) {
      return [];
    }

    return [
      {
        title: sectionName === "See" ? "See the highlights" : sectionName === "Do" ? "Pick one signature outing" : `Plan around ${sectionName.toLowerCase()}`,
        description:
          sectionName === "See"
            ? "Use the city’s major sights and districts as the anchor for the first day."
            : sectionName === "Do"
              ? "Reserve one activity block for the city’s most trip-defining experience."
              : sectionName === "Eat"
                ? "Make space for local specialties and one stronger dinner reservation."
                : sectionName === "Drink"
                  ? "Choose one area for drinks or a slower night out so the group can stay coordinated."
                  : sectionName === "Buy"
                    ? "Leave time for markets, design shops, or one intentional shopping stop."
                    : "Use lodging placement to reduce transit friction for the rest of the itinerary.",
        category:
          sectionName === "Eat"
            ? "food"
            : sectionName === "Drink"
              ? "nightlife"
              : sectionName === "Buy"
                ? "shopping"
                : sectionName === "Sleep"
                  ? "wellness"
                  : sectionName === "Do"
                    ? "outdoors"
                    : "culture"
      } satisfies DestinationActivity
    ];
  });

  return mapped.slice(0, 4);
}

function fallbackActivities(destination: DestinationCatalogItem) {
  const fromTags = destination.tags
    .map((tag) => activityCatalog[tag])
    .filter((activity): activity is DestinationActivity => Boolean(activity));

  const fromBestFor = destination.bestFor.map((item) => ({
    title: toTitleCase(item),
    description: `This destination is especially strong for ${item}.`,
    category: "culture" as const
  }));

  return [...fromTags, ...fromBestFor].slice(0, 4);
}

export async function buildDestinationEnrichment(
  destination: DestinationCatalogItem
): Promise<DestinationEnrichment> {
  const fetchedAt = new Date().toISOString();
  const staleAt = new Date(Date.now() + THIRTY_DAYS_MS).toISOString();

  const [wikipediaSummary, wikivoyageGuide, countryMeta] = await Promise.all([
    fetchWikipediaSummary(destination),
    fetchWikivoyageGuide(destination),
    fetchWorldBankCountryMeta(destination)
  ]);
  const groqSynthesis = await synthesizeWithGroq({
    destination,
    wikipediaSummary,
    wikivoyageGuide
  });

  const budgetTier = getBudgetTierFromIncomeLevel(countryMeta?.incomeLevelId ?? "");
  const localCosts = adjustCostsForCity(getBaseLocalCosts(budgetTier), destination);
  const topActivities = deriveActivitiesFromSections(wikivoyageGuide?.sectionLines ?? []);
  const fallbackTopActivities = fallbackActivities(destination);
  const vibeTags = deriveVibeTags(destination, wikivoyageGuide?.sectionLines ?? []);

  const shortSummary =
    groqSynthesis?.shortSummary ??
    wikipediaSummary?.shortSummary ??
    firstSentences(wikivoyageGuide?.longSummary ?? "", 1) ??
    destination.summary;

  const longSummary =
    groqSynthesis?.longSummary ||
    wikivoyageGuide?.longSummary ||
    wikipediaSummary?.longSummary ||
    `${destination.summary} A good plan here usually balances ${
      (topActivities[0] ?? fallbackTopActivities[0])?.title.toLowerCase() ?? "sightseeing"
    } with enough breathing room for the group to keep momentum.`;

  const usedProviderData = Boolean(wikipediaSummary || wikivoyageGuide || countryMeta);
  const coverage: DestinationEnrichment["coverage"] =
    wikipediaSummary && wikivoyageGuide && countryMeta ? "complete" : "partial";

  return {
    destinationId: destination.id,
    shortSummary,
    longSummary,
    vibeTags: groqSynthesis?.vibeTags?.slice(0, 6) ?? vibeTags,
    topActivities:
      groqSynthesis?.topActivities?.slice(0, 5) ??
      (topActivities.length > 0 ? topActivities : fallbackTopActivities),
    budgetTier,
    localCosts,
    source: groqSynthesis
      ? "llm_synthesized"
      : usedProviderData
        ? "mixed_free_apis"
        : "heuristic",
    coverage,
    fetchedAt,
    staleAt
  };
}

export function haversineMiles(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(toLat - fromLat);
  const dLon = toRadians(toLon - fromLon);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
}

export function estimateTravelCostUsd(options: {
  distanceMiles: number;
  sameCountry: boolean;
}) {
  const base = options.sameCountry ? 95 : 180;
  const distanceFactor = options.sameCountry ? 0.08 : 0.115;
  const longHaulSurcharge = options.distanceMiles > 4500 ? 210 : options.distanceMiles > 2500 ? 95 : 0;
  return Math.round(base + options.distanceMiles * distanceFactor + longHaulSurcharge);
}
