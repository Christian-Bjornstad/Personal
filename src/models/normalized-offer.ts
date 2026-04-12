export interface NormalizedOffer {
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
  url: string;
  raw: unknown;
}

