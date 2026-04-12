import { NormalizedOffer } from "./normalized-offer";

export interface StoredOfferSnapshot {
  source: "charter" | "flights";
  searchId: string;
  stableId: string;
  title: string;
  destination: string | null;
  departureDate: string | null;
  returnDate: string | null;
  nights: number | null;
  supplier: string | null;
  totalPrice: number | null;
  pricePerPerson: number | null;
  rating: number | null;
  guestRating: number | null;
  hotelImage: string | null;
  tempAir: number | null;
  tempWater: number | null;
  distanceBeach: number | null;
  distanceCentre: number | null;
  url: string;
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

