import { readFile } from "fs/promises";
import path from "path";
import { buildVisaResult, type VisaLookupResult } from "@/lib/visa";

const LOCAL_DATASET_PATH = path.join(
  process.cwd(),
  "src/lib/visa-data/passport-index-tidy-iso2.csv"
);
const REMOTE_DATASET_URL =
  "https://raw.githubusercontent.com/ilyankou/passport-index-dataset/master/passport-index-tidy-iso2.csv";

let datasetPromise: Promise<VisaDataset> | null = null;

interface VisaDataset {
  matrix: Map<string, Map<string, string>>;
  countries: string[];
}

export async function getVisaDataset() {
  if (!datasetPromise) {
    datasetPromise = loadVisaDataset();
  }

  return datasetPromise;
}

export async function getVisaCountries() {
  const dataset = await getVisaDataset();
  return dataset.countries;
}

export async function lookupVisaRequirement(
  passportCode: string,
  destinationCode: string
): Promise<VisaLookupResult> {
  const dataset = await getVisaDataset();
  const normalizedPassport = passportCode.trim().toUpperCase();
  const normalizedDestination = destinationCode.trim().toUpperCase();
  const rawRequirement = dataset.matrix.get(normalizedPassport)?.get(normalizedDestination) ?? "visa required";

  return buildVisaResult(normalizedPassport, normalizedDestination, rawRequirement);
}

async function loadVisaDataset(): Promise<VisaDataset> {
  const text = await loadDatasetText();
  return parseDataset(text);
}

async function loadDatasetText() {
  try {
    return await readFile(LOCAL_DATASET_PATH, "utf8");
  } catch {
    const response = await fetch(REMOTE_DATASET_URL);
    if (!response.ok) {
      throw new Error("Unable to load visa dataset");
    }
    return response.text();
  }
}

function parseDataset(text: string): VisaDataset {
  const rows = text.split(/\r?\n/).filter(Boolean);
  const matrix = new Map<string, Map<string, string>>();
  const countries = new Set<string>();

  for (const row of rows.slice(1)) {
    const [passport, destination, requirement] = row.split(",");
    if (!passport || !destination || !requirement) {
      continue;
    }

    const passportKey = passport.trim().toUpperCase();
    const destinationKey = destination.trim().toUpperCase();
    const value = requirement.trim();

    countries.add(passportKey);
    countries.add(destinationKey);

    if (!matrix.has(passportKey)) {
      matrix.set(passportKey, new Map<string, string>());
    }

    matrix.get(passportKey)?.set(destinationKey, value);
  }

  return {
    matrix,
    countries: [...countries].sort()
  };
}
