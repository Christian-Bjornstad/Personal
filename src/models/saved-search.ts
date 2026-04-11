export type SearchType = "charter" | "flights";

export interface NotifyOnConfig {
  new_offer: boolean;
  price_drop_percent?: number;
  price_drop_nok?: number;
  rating_increase?: number;
}

export interface CharterSearchParams {
  return_date_max?: string;
  adults?: number;
  direct_flight?: boolean;
  temp_air_day_max?: number;
  depart_date_exact?: string;
  infants?: number;
  number_of_nights?: number;
  days_min?: number;
  origin_airport_code?: string;
  distance_centre?: number;
  return_date_min?: string;
  fields?: string[];
  temp_water?: number;
  country_iso?: string;
  category?: "SUNBATH" | "CITY" | "SKI" | "EXOTIC";
  hotel_name?: string;
  board_type?: "breakfast" | "half_board" | "full_board" | "all_inclusive";
  days_max?: number;
  distance_beach?: number;
  guest_rating?: number;
  children?: number;
  radius?: number;
  temp_air_day_min?: number;
  lon?: number;
  depart_date_min?: string;
  sort?:
    | "price_asc"
    | "price_desc"
    | "rating_asc"
    | "rating_desc"
    | "distance_beach_asc"
    | "distance_airport_asc"
    | "guest_rating_desc";
  rating?: number;
  depart_date_max?: string;
  destination_name?: string;
  features?: Array<
    | "ac"
    | "adultsonly"
    | "apartment"
    | "bar"
    | "childspool"
    | "gym"
    | "heatedpool"
    | "kidsclub"
    | "pool"
    | "seaview"
    | "restaurant"
    | "spa"
  >;
  destination_airport_code?: string;
  return_date_exact?: string;
  max_price?: number;
  bbox?: string;
  lat?: number;
  limit?: number;
  distance_airport?: number;
}

export interface FlightsSearchParams {
  orig?: string;
  dest?: string;
  dep_date?: string;
  dep_date_from?: string;
  dep_date_to?: string;
  ret_date?: string;
  ret_date_from?: string;
  ret_date_to?: string;
  adt?: number;
  chd?: number;
  inf?: number;
  direct?: boolean;
  max_price?: number;
  nights_min?: number;
  nights_max?: number;
  sort?: "price_asc" | "price_desc" | "dep_date_asc" | "dep_date_desc";
  limit?: number;
}

export interface BaseSavedSearch<TType extends SearchType, TParams> {
  id: string;
  name: string;
  type: TType;
  enabled: boolean;
  notify_on: NotifyOnConfig;
  params: TParams;
}

export type CharterSavedSearch = BaseSavedSearch<"charter", CharterSearchParams>;
export type FlightsSavedSearch = BaseSavedSearch<"flights", FlightsSearchParams>;
export type SavedSearch = CharterSavedSearch | FlightsSavedSearch;

export function isCharterSavedSearch(search: SavedSearch): search is CharterSavedSearch {
  return search.type === "charter";
}

export function isFlightsSavedSearch(search: SavedSearch): search is FlightsSavedSearch {
  return search.type === "flights";
}

