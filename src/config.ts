import { readFile } from "node:fs/promises";
import path from "node:path";
import { SavedSearch, SearchType } from "./models/saved-search";

export interface AppDefaults {
  app: {
    request_timeout_ms: number;
    max_offers_per_search: number;
  };
  discord: {
    username: string;
  };
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

function validateSearchType(value: unknown): value is SearchType {
  return value === "charter" || value === "flights";
}

function validateSavedSearches(payload: unknown): SavedSearch[] {
  if (!Array.isArray(payload)) {
    throw new Error("config/saved-searches.json must contain an array.");
  }

  const seenIds = new Set<string>();

  return payload.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Saved search at index ${index} must be an object.`);
    }

    const search = item as Record<string, unknown>;

    if (typeof search.id !== "string" || !search.id) {
      throw new Error(`Saved search at index ${index} is missing a valid "id".`);
    }

    if (seenIds.has(search.id)) {
      throw new Error(`Duplicate saved search id "${search.id}".`);
    }
    seenIds.add(search.id);

    if (typeof search.name !== "string" || !search.name) {
      throw new Error(`Saved search "${search.id}" is missing a valid "name".`);
    }

    if (!validateSearchType(search.type)) {
      throw new Error(`Saved search "${search.id}" must have type "charter" or "flights".`);
    }

    if (typeof search.enabled !== "boolean") {
      throw new Error(`Saved search "${search.id}" must include a boolean "enabled".`);
    }

    if (!search.notify_on || typeof search.notify_on !== "object") {
      throw new Error(`Saved search "${search.id}" must include a "notify_on" object.`);
    }

    if (!search.params || typeof search.params !== "object" || Array.isArray(search.params)) {
      throw new Error(`Saved search "${search.id}" must include a "params" object.`);
    }

    return search as unknown as SavedSearch;
  });
}

function validateDefaults(payload: unknown): AppDefaults {
  if (!payload || typeof payload !== "object") {
    throw new Error("config/defaults.json must be an object.");
  }

  const defaults = payload as Partial<AppDefaults>;

  if (
    typeof defaults.app?.request_timeout_ms !== "number" ||
    typeof defaults.app?.max_offers_per_search !== "number" ||
    typeof defaults.discord?.username !== "string"
  ) {
    throw new Error("config/defaults.json is missing required fields.");
  }

  return defaults as AppDefaults;
}

export async function loadAppConfig(projectRoot: string): Promise<{
  savedSearches: SavedSearch[];
  defaults: AppDefaults;
}> {
  const defaultsPath = path.resolve(projectRoot, "config/defaults.json");
  const savedSearchesPath = path.resolve(projectRoot, "config/saved-searches.json");

  const defaults = validateDefaults(await readJsonFile<unknown>(defaultsPath));
  const savedSearches = validateSavedSearches(await readJsonFile<unknown>(savedSearchesPath));

  return {
    defaults,
    savedSearches
  };
}

