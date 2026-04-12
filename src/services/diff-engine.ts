import { NormalizedOffer } from "../models/normalized-offer";
import { SavedSearch } from "../models/saved-search";
import { SearchState, StoredOfferSnapshot, TravelAlertState } from "../models/state";

export type AlertKind = "new_offer" | "price_drop" | "rating_increase";

export interface AlertEvent {
  kind: AlertKind;
  search: SavedSearch;
  current: NormalizedOffer;
  previous?: StoredOfferSnapshot;
  deltaNok?: number;
  deltaPercent?: number;
  ratingDelta?: number;
}

export interface SearchDiffSummary {
  newOffers: number;
  removedOffers: number;
  priceDrops: number;
  priceIncreases: number;
  ratingImprovements: number;
}

export interface DiffEngineResult {
  alerts: AlertEvent[];
  nextState: TravelAlertState;
  summaries: Record<string, SearchDiffSummary>;
}

function defaultSummary(): SearchDiffSummary {
  return {
    newOffers: 0,
    removedOffers: 0,
    priceDrops: 0,
    priceIncreases: 0,
    ratingImprovements: 0
  };
}

function meetsPriceDropThreshold(
  previousPrice: number,
  currentPrice: number,
  search: SavedSearch
): { shouldNotify: boolean; deltaNok: number; deltaPercent: number } {
  const deltaNok = previousPrice - currentPrice;
  const deltaPercent = previousPrice > 0 ? (deltaNok / previousPrice) * 100 : 0;
  const minNok = search.notify_on.price_drop_nok ?? Number.POSITIVE_INFINITY;
  const minPercent = search.notify_on.price_drop_percent ?? Number.POSITIVE_INFINITY;

  return {
    shouldNotify: deltaNok >= minNok || deltaPercent >= minPercent,
    deltaNok,
    deltaPercent
  };
}

function toSnapshot(offer: NormalizedOffer, previous: StoredOfferSnapshot | undefined, now: string): StoredOfferSnapshot {
  const priceChanged =
    previous?.totalPrice !== undefined &&
    previous.totalPrice !== null &&
    offer.totalPrice !== null &&
    previous.totalPrice !== offer.totalPrice;

  return {
    source: offer.source,
    searchId: offer.searchId,
    stableId: offer.stableId,
    title: offer.title,
    destination: offer.destination,
    departureDate: offer.departureDate,
    returnDate: offer.returnDate,
    nights: offer.nights,
    supplier: offer.supplier,
    totalPrice: offer.totalPrice,
    pricePerPerson: offer.pricePerPerson,
    rating: offer.rating,
    guestRating: offer.guestRating,
    url: offer.url,
    firstSeenAt: previous?.firstSeenAt ?? now,
    lastSeenAt: now,
    lastPriceChangeAt: priceChanged ? now : previous?.lastPriceChangeAt ?? null
  };
}

export function diffOffers(params: {
  searches: SavedSearch[];
  currentOffersBySearchId: Record<string, NormalizedOffer[]>;
  previousState: TravelAlertState;
  now: string;
}): DiffEngineResult {
  const { searches, currentOffersBySearchId, previousState, now } = params;
  const alerts: AlertEvent[] = [];
  const nextState: TravelAlertState = {
    version: 1,
    updatedAt: now,
    searches: {}
  };
  const summaries: Record<string, SearchDiffSummary> = {};
  const processedSearchIds = new Set<string>();

  for (const search of searches) {
    processedSearchIds.add(search.id);
    const summary = defaultSummary();
    const previousSearchState = previousState.searches[search.id];
    const currentOffers = currentOffersBySearchId[search.id];

    if (!currentOffers) {
      if (previousSearchState) {
        nextState.searches[search.id] = previousSearchState;
      }
      summaries[search.id] = summary;
      continue;
    }

    const previousOffers = previousSearchState?.offers ?? {};
    const nextOffers: Record<string, StoredOfferSnapshot> = {};

    for (const offer of currentOffers) {
      const previous = previousOffers[offer.stableId];
      nextOffers[offer.stableId] = toSnapshot(offer, previous, now);

      if (!previous) {
        summary.newOffers += 1;

        if (search.notify_on.new_offer) {
          alerts.push({
            kind: "new_offer",
            search,
            current: offer
          });
        }

        continue;
      }

      if (
        previous.totalPrice !== null &&
        offer.totalPrice !== null &&
        offer.totalPrice < previous.totalPrice
      ) {
        summary.priceDrops += 1;
        const priceDrop = meetsPriceDropThreshold(previous.totalPrice, offer.totalPrice, search);

        if (priceDrop.shouldNotify) {
          alerts.push({
            kind: "price_drop",
            search,
            current: offer,
            previous,
            deltaNok: priceDrop.deltaNok,
            deltaPercent: priceDrop.deltaPercent
          });
        }
      } else if (
        previous.totalPrice !== null &&
        offer.totalPrice !== null &&
        offer.totalPrice > previous.totalPrice
      ) {
        summary.priceIncreases += 1;
      }

      if (
        previous.guestRating !== null &&
        offer.guestRating !== null &&
        offer.guestRating > previous.guestRating
      ) {
        const ratingDelta = offer.guestRating - previous.guestRating;
        summary.ratingImprovements += 1;

        if (ratingDelta >= (search.notify_on.rating_increase ?? Number.POSITIVE_INFINITY)) {
          alerts.push({
            kind: "rating_increase",
            search,
            current: offer,
            previous,
            ratingDelta
          });
        }
      }
    }

    for (const stableId of Object.keys(previousOffers)) {
      if (!nextOffers[stableId]) {
        summary.removedOffers += 1;
      }
    }

    nextState.searches[search.id] = {
      searchId: search.id,
      searchName: search.name,
      source: search.type,
      lastRunAt: now,
      offers: nextOffers
    } satisfies SearchState;
    summaries[search.id] = summary;
  }

  for (const [searchId, searchState] of Object.entries(previousState.searches)) {
    if (!processedSearchIds.has(searchId)) {
      nextState.searches[searchId] = searchState;
    }
  }

  return {
    alerts,
    nextState,
    summaries
  };
}

