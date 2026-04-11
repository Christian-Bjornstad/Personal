import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { TravelAlertState } from "../models/state";

function emptyState(): TravelAlertState {
  return {
    version: 1,
    updatedAt: null,
    searches: {}
  };
}

export async function loadState(projectRoot: string): Promise<TravelAlertState> {
  const filePath = path.resolve(projectRoot, "data/last-results.json");

  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as TravelAlertState;

    if (!parsed || typeof parsed !== "object" || parsed.version !== 1 || !parsed.searches) {
      return emptyState();
    }

    return parsed;
  } catch {
    return emptyState();
  }
}

export async function saveState(projectRoot: string, state: TravelAlertState): Promise<void> {
  const dataDir = path.resolve(projectRoot, "data");
  const filePath = path.resolve(dataDir, "last-results.json");

  await mkdir(dataDir, { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

