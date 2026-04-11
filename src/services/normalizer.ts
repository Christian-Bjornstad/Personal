import { createHash } from "node:crypto";
import { CharterOfferRaw, CharterSearchResponse } from "../clients/charter-client";
import { FlightOfferRaw, FlightsSearchResponse } from "../clients/flights-client";
import { NormalizedOffer } from "../models/normalized-offer";

function buildHash(parts: Array<string | number | null | undefined>): string {
  return createHash("sha256")
    .update(parts.map((part) => String(part ?? "")).join("|"))
    .digest("hex")
    .slice(0, 24);
}

function pickString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function pickNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildCharterStableId(offer: CharterOfferRaw): string {
  return `charter:${buildHash([
    offer.hotel_name,
    offer.destination_name,
    offer.departure_date,
    offer.return_date,
    offer.supplier_name,
    offer.room_type,
    offer.origin_airport_code
  ])}`;
}

function buildFlightsStableId(offer: FlightOfferRaw): string {
  if (offer.offer_id) {
    return `flights:${offer.offer_id}`;
  }

  const firstSegment = offer.origin_destinations?.[0];
  const lastSegment = offer.origin_destinations?.[offer.origin_destinations.length - 1];

  return `flights:${buildHash([
    firstSegment?.departure?.airport_code,
    lastSegment?.arrival?.airport_code,
    firstSegment?.departure?.datetime,
    lastSegment?.arrival?.datetime,
    offer.trip_duration_nights,
    offer.supplier
  ])}`;
}

export function normalizeCharterResponse(
  searchId: string,
  response: CharterSearchResponse
): NormalizedOffer[] {
  const results = Array.isArray(response.results) ? response.results : [];

  return results
    .filter((offer): offer is CharterOfferRaw & { url: string } => typeof offer?.url === "string")
    .map((offer) => ({
      source: "charter" as const,
      searchId,
      stableId: buildCharterStableId(offer),
      title: pickString(offer.hotel_name) ?? "Package holiday deal",
      destination: pickString(offer.destination_name),
      departureDate: pickString(offer.departure_date),
      returnDate: pickString(offer.return_date),
      nights: pickNumber(offer.number_of_nights),
      supplier: pickString(offer.supplier_name),
      totalPrice: pickNumber(offer.total_price),
      pricePerPerson: pickNumber(offer.price_per_pers),
      rating: pickNumber(offer.guest_rating),
      url: offer.url,
      raw: offer
    }));
}

export function normalizeFlightsResponse(
  searchId: string,
  response: FlightsSearchResponse
): NormalizedOffer[] {
  const offers = Array.isArray(response.offers) ? response.offers : [];

  return offers
    .filter((offer): offer is FlightOfferRaw & { url: string } => typeof offer?.url === "string")
    .map((offer) => {
      const firstSegment = offer.origin_destinations?.[0];
      const lastSegment = offer.origin_destinations?.[offer.origin_destinations.length - 1];
      const origin = pickString(firstSegment?.departure?.airport_code);
      const destination = pickString(lastSegment?.arrival?.airport_code);
      const nights = pickNumber(offer.trip_duration_nights);

      return {
        source: "flights" as const,
        searchId,
        stableId: buildFlightsStableId(offer),
        title: [origin, destination].filter(Boolean).join(" -> ") || "Flight deal",
        destination,
        departureDate: pickString(firstSegment?.departure?.datetime),
        returnDate: pickString(lastSegment?.arrival?.datetime),
        nights,
        supplier: pickString(offer.supplier),
        totalPrice: pickNumber(offer.total_price?.amount),
        pricePerPerson: pickNumber(offer.total_price?.per_pax_amount),
        rating: null,
        url: offer.url,
        raw: offer
      };
    });
}

