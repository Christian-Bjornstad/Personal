import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { OpenApiDocument } from "../types/openapi";

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadJsonFile(filePath: string): Promise<OpenApiDocument> {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as OpenApiDocument;

  if (!parsed || typeof parsed !== "object" || !parsed.paths) {
    throw new Error(`OpenAPI file is invalid: ${filePath}`);
  }

  return parsed;
}

async function resolveExistingPath(projectRoot: string, candidates: string[]): Promise<string> {
  for (const candidate of candidates) {
    const absolutePath = path.resolve(projectRoot, candidate);

    if (await exists(absolutePath)) {
      return absolutePath;
    }
  }

  throw new Error(`Could not find any of these spec files: ${candidates.join(", ")}`);
}

export interface LoadedTravelSpecs {
  charter: {
    filePath: string;
    document: OpenApiDocument;
  };
  flights: {
    filePath: string;
    document: OpenApiDocument;
  };
}

export async function loadTravelSpecs(projectRoot: string): Promise<LoadedTravelSpecs> {
  const charterPath = await resolveExistingPath(projectRoot, [
    "specs/api_search.json",
    "api_search.json",
    "specs:api_search.json"
  ]);

  const flightsPath = await resolveExistingPath(projectRoot, [
    "specs/api_search_flights.json",
    "specs/api_search (1).json",
    "api_search_flights.json",
    "api_search (1).json",
    "specs:api_search_flights.json",
    "specs:api_search (1).json"
  ]);

  return {
    charter: {
      filePath: charterPath,
      document: await loadJsonFile(charterPath)
    },
    flights: {
      filePath: flightsPath,
      document: await loadJsonFile(flightsPath)
    }
  };
}

