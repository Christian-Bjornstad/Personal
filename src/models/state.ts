import { NormalizedOffer } from "./normalized-offer";

export interface StoredOfferSnapshot extends Omit<NormalizedOffer, "raw"> {
  firstSeenAt: string;
  lastSeenAt: string;
  lastPriceChangeAt: string | null;
}

export interface SearchState {
  searchId: string;
  searchName: string;
  source: "charter" | "flights";
  lastRunAt: string;
  offers: Record<string, StoredOfferSnapshot>;
}

export interface TravelAlertState {
  version: 1;
  updatedAt: string | null;
  searches: Record<string, SearchState>;
}

