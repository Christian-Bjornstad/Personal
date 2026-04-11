import { CharterClient } from "../clients/charter-client";
import { FlightsClient } from "../clients/flights-client";
import { isCharterSavedSearch, isFlightsSavedSearch, SavedSearch } from "../models/saved-search";
import { NormalizedOffer } from "../models/normalized-offer";
import { normalizeCharterResponse, normalizeFlightsResponse } from "./normalizer";

export interface SearchRunnerResult {
  offersBySearchId: Record<string, NormalizedOffer[]>;
  failures: Record<string, string>;
}

function sortOffersByPrice(offers: NormalizedOffer[]): NormalizedOffer[] {
  return [...offers].sort((left, right) => {
    if (left.totalPrice === null && right.totalPrice === null) {
      return left.stableId.localeCompare(right.stableId);
    }

    if (left.totalPrice === null) {
      return 1;
    }

    if (right.totalPrice === null) {
      return -1;
    }

    return left.totalPrice - right.totalPrice;
  });
}

export class SearchRunner {
  constructor(
    private readonly charterClient: CharterClient,
    private readonly flightsClient: FlightsClient,
    private readonly maxOffersPerSearch: number
  ) {}

  async run(searches: SavedSearch[]): Promise<SearchRunnerResult> {
    const offersBySearchId: Record<string, NormalizedOffer[]> = {};
    const failures: Record<string, string> = {};

    for (const search of searches) {
      if (!search.enabled) {
        continue;
      }

      try {
        if (isCharterSavedSearch(search)) {
          const response = await this.charterClient.search(search.params);
          offersBySearchId[search.id] = sortOffersByPrice(
            normalizeCharterResponse(search.id, response)
          ).slice(0, this.maxOffersPerSearch);
          continue;
        }

        if (isFlightsSavedSearch(search)) {
          const response = await this.flightsClient.search(search.params);
          offersBySearchId[search.id] = sortOffersByPrice(
            normalizeFlightsResponse(search.id, response)
          ).slice(0, this.maxOffersPerSearch);
        }
      } catch (error) {
        failures[search.id] = error instanceof Error ? error.message : String(error);
      }
    }

    return {
      offersBySearchId,
      failures
    };
  }
}
