import { FlightsSearchParams } from "../models/saved-search";
import { InspectedApiSpec } from "../types/openapi";
import { appendQueryParams, sanitizeQueryParams } from "../utils/query";

export interface FlightOriginDestinationRaw {
  departure?: {
    airport_code?: string;
    datetime?: string;
  };
  arrival?: {
    airport_code?: string;
    datetime?: string;
  };
  flight_numbers?: string[];
  stop_quantity?: number;
}

export interface FlightOfferRaw {
  offer_id?: string;
  supplier?: string;
  origin_destinations?: FlightOriginDestinationRaw[];
  total_price?: {
    amount?: number;
    currency_code?: string;
    per_pax_amount?: number;
  };
  trip_duration_nights?: number;
  url?: string;
}

export interface FlightsSearchResponse {
  offers?: FlightOfferRaw[];
  total?: number;
}

export class FlightsClient {
  constructor(
    private readonly spec: InspectedApiSpec,
    private readonly timeoutMs: number
  ) {}

  async search(params: FlightsSearchParams): Promise<FlightsSearchResponse> {
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
        `Flights API request failed with ${response.status} ${response.statusText}: ${errorBody.slice(
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
        `Flights API returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    if (!payload || typeof payload !== "object") {
      throw new Error("Flights API returned a non-object JSON payload.");
    }

    return payload as FlightsSearchResponse;
  }
}
