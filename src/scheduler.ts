import { loadAppConfig } from "./config";
import { CharterClient } from "./clients/charter-client";
import { FlightsClient } from "./clients/flights-client";
import { loadTravelSpecs } from "./openapi/loader";
import { inspectOpenApiDocument } from "./openapi/inspector";
import { diffOffers } from "./services/diff-engine";
import { DiscordService } from "./services/discord";
import { loadState, saveState } from "./services/persistence";
import { SearchRunner } from "./services/search-runner";
import { nowIso } from "./utils/dates";
import { logger } from "./utils/logger";

export interface RunSummary {
  alertsSent: number;
  enabledSearches: number;
  succeededSearches: number;
  failedSearches: number;
  failures: Record<string, string>;
}

export async function runOnce(projectRoot: string): Promise<RunSummary> {
  const { defaults, savedSearches } = await loadAppConfig(projectRoot);
  const loadedSpecs = await loadTravelSpecs(projectRoot);
  const charterSpec = inspectOpenApiDocument(
    "charter",
    loadedSpecs.charter.filePath,
    loadedSpecs.charter.document
  );
  const flightsSpec = inspectOpenApiDocument(
    "flights",
    loadedSpecs.flights.filePath,
    loadedSpecs.flights.document
  );

  logger.info("Loaded OpenAPI specs.", {
    charter: {
      filePath: charterSpec.filePath,
      requestUrl: charterSpec.requestUrl,
      parameters: charterSpec.queryParameterNames
    },
    flights: {
      filePath: flightsSpec.filePath,
      requestUrl: flightsSpec.requestUrl,
      parameters: flightsSpec.queryParameterNames
    }
  });

  const enabledSearches = savedSearches.filter((search) => search.enabled);

  if (enabledSearches.length === 0) {
    logger.warn("No enabled saved searches found.");

    return {
      alertsSent: 0,
      enabledSearches: 0,
      succeededSearches: 0,
      failedSearches: 0,
      failures: {}
    };
  }

  const runner = new SearchRunner(
    new CharterClient(charterSpec, defaults.app.request_timeout_ms),
    new FlightsClient(flightsSpec, defaults.app.request_timeout_ms),
    defaults.app.max_offers_per_search
  );

  const previousState = await loadState(projectRoot);
  const runnerResult = await runner.run(enabledSearches);
  const now = nowIso();

  if (Object.keys(runnerResult.offersBySearchId).length === 0) {
    throw new Error("All enabled searches failed. No results were collected.");
  }

  const diffResult = diffOffers({
    searches: enabledSearches,
    currentOffersBySearchId: runnerResult.offersBySearchId,
    previousState,
    now
  });

  const discordService = new DiscordService(
    process.env.DISCORD_WEBHOOK_URL,
    defaults.discord.username
  );

  if (diffResult.alerts.length === 0 && process.env.DISCORD_WEBHOOK_URL) {
    await discordService.sendSummary({
      enabledSearches: enabledSearches.length,
      succeededSearches: Object.keys(runnerResult.offersBySearchId).length
    });
  }

  const deliveredAlertCount = await discordService.sendAlerts(diffResult.alerts);
  await saveState(projectRoot, diffResult.nextState);

  for (const [searchId, summary] of Object.entries(diffResult.summaries)) {
    logger.info(`Search summary for ${searchId}`, summary);
  }

  for (const [searchId, errorMessage] of Object.entries(runnerResult.failures)) {
    logger.warn(`Search failed for ${searchId}: ${errorMessage}`);
  }

  return {
    alertsSent: deliveredAlertCount,
    enabledSearches: enabledSearches.length,
    succeededSearches: Object.keys(runnerResult.offersBySearchId).length,
    failedSearches: Object.keys(runnerResult.failures).length,
    failures: runnerResult.failures
  };
}
