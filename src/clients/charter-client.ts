import { CharterSearchParams } from "../models/saved-search";
import { InspectedApiSpec } from "../types/openapi";
import { appendQueryParams, sanitizeQueryParams } from "../utils/query";

export interface CharterOfferRaw {
  hotel_name?: string;
  destination_name?: string;
  departure_date?: string;
  return_date?: string;
  number_of_nights?: number;
  rating?: number;
  guest_rating?: number;
  total_price?: number;
  price_per_pers?: number;
  supplier_name?: string;
  room_type?: string;
  hotel_description?: string;
  hotel_image?: string;
  url?: string;
  origin_airport_code?: string;
  temp_air_day?: number;
  temp_water?: number;
  distance_beach?: number;
  distance_centre?: number;
}

export interface CharterSearchResponse {
  results?: CharterOfferRaw[];
}

export class CharterClient {
  constructor(
    private readonly spec: InspectedApiSpec,
    private readonly timeoutMs: number
  ) {}

  async search(params: CharterSearchParams): Promise<CharterSearchResponse> {
    const sanitized = sanitizeQueryParams(params as Record<string, unknown>, this.spec);
    const requestUrl = appendQueryParams(new URL(this.spec.requestUrl), sanitized);
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(this.timeoutMs)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Charter API request failed with ${response.status} ${response.statusText}: ${errorBody.slice(
          0,
          500
        )}`
      );
    }

    let payload: unknown;

    try {
      payload = (await response.json()) as unknown;
    } catch (error) {
      throw new Error(
        `Charter API returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    if (!payload || typeof payload !== "object") {
      throw new Error("Charter API returned a non-object JSON payload.");
    }

    return payload as CharterSearchResponse;
  }
}
