export type VisaStatus =
  | "visa_free"
  | "visa_on_arrival"
  | "eta"
  | "e_visa"
  | "visa_required"
  | "no_admission"
  | "same_country"
  | "unknown";

export interface VisaLookupResult {
  passportCode: string;
  destinationCode: string;
  status: VisaStatus;
  label: string;
  rawRequirement: string;
}

const CACHE_KEY = "roammate-visa-cache-v1";
const memoryCache = new Map<string, VisaLookupResult>();

function cacheKey(passportCode: string, destinationCode: string) {
  return `${passportCode.toUpperCase()}_${destinationCode.toUpperCase()}`;
}

function readLocalCache() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as Record<string, VisaLookupResult>;
  } catch {
    return null;
  }
}

function writeLocalCache(next: Record<string, VisaLookupResult>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota or privacy mode failures.
  }
}

function readCachedVisaLookup(passportCode: string, destinationCode: string) {
  const key = cacheKey(passportCode, destinationCode);
  if (memoryCache.has(key)) {
    return memoryCache.get(key) ?? null;
  }

  const local = readLocalCache();
  if (local?.[key]) {
    memoryCache.set(key, local[key]);
    return local[key];
  }

  return null;
}

function storeCachedVisaLookup(result: VisaLookupResult) {
  const key = cacheKey(result.passportCode, result.destinationCode);
  memoryCache.set(key, result);

  const local = readLocalCache() ?? {};
  local[key] = result;
  writeLocalCache(local);
}

function normalizeRequirement(raw: string): Pick<VisaLookupResult, "status" | "label"> {
  const lower = raw.trim().toLowerCase();

  if (lower === "visa free") {
    return { status: "visa_free", label: "Visa-free" };
  }

  if (/^\d+$/.test(lower)) {
    return { status: "visa_free", label: `Visa-free up to ${lower} days` };
  }

  if (lower === "visa on arrival") {
    return { status: "visa_on_arrival", label: "Visa on arrival" };
  }

  if (lower === "eta") {
    return { status: "eta", label: "ETA required" };
  }

  if (lower === "e-visa") {
    return { status: "e_visa", label: "eVisa required" };
  }

  if (lower === "visa required") {
    return { status: "visa_required", label: "Visa required" };
  }

  if (lower === "no admission") {
    return { status: "no_admission", label: "No admission" };
  }

  if (lower === "-1") {
    return { status: "same_country", label: "Same country" };
  }

  return { status: "unknown", label: raw };
}

export async function fetchVisaLookup(
  passportCode: string,
  destinationCode: string
): Promise<VisaLookupResult> {
  const normalizedPassport = passportCode.trim().toUpperCase();
  const normalizedDestination = destinationCode.trim().toUpperCase();

  const cached = readCachedVisaLookup(normalizedPassport, normalizedDestination);
  if (cached) {
    return cached;
  }

  const response = await fetch(
    `/api/visa?passport=${encodeURIComponent(normalizedPassport)}&destination=${encodeURIComponent(normalizedDestination)}`
  );

  if (!response.ok) {
    throw new Error("Failed to load visa data");
  }

  const result = (await response.json()) as VisaLookupResult;
  storeCachedVisaLookup(result);
  return result;
}

export function getVisaCacheKey(passportCode: string, destinationCode: string) {
  return cacheKey(passportCode, destinationCode);
}

export function formatVisaLabel(result?: VisaLookupResult | null) {
  if (!result) {
    return "Loading visa status...";
  }

  return result.label;
}

export function buildVisaResult(
  passportCode: string,
  destinationCode: string,
  rawRequirement: string
): VisaLookupResult {
  const normalized = normalizeRequirement(rawRequirement);
  return {
    passportCode: passportCode.toUpperCase(),
    destinationCode: destinationCode.toUpperCase(),
    status: normalized.status,
    label: normalized.label,
    rawRequirement
  };
}
