import { AlertEvent } from "./diff-engine";
import { formatDateTime } from "../utils/dates";

interface DiscordEmbed {
  title: string;
  url?: string;
  description?: string;
  color?: number;
}

interface DiscordWebhookPayload {
  username?: string;
  content?: string;
  embeds?: DiscordEmbed[];
}

function chunk<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }

  return result;
}

function formatPrice(value: number | null): string {
  if (value === null) {
    return "n/a";
  }

  return `${new Intl.NumberFormat("nb-NO").format(value)} NOK`;
}

function embedForAlert(alert: AlertEvent): DiscordEmbed {
  const lines = [
    `Saved search: ${alert.search.name}`,
    `Offer: ${alert.current.title}`,
    `Destination: ${alert.current.destination ?? "n/a"}`,
    `Total price: ${formatPrice(alert.current.totalPrice)}`,
    `Price per person: ${formatPrice(alert.current.pricePerPerson)}`,
    `Dates: ${formatDateTime(alert.current.departureDate)} -> ${formatDateTime(alert.current.returnDate)}`,
    `Nights: ${alert.current.nights ?? "n/a"}`,
    `Rating: ${alert.current.rating ?? "n/a"}`,
    `Supplier: ${alert.current.supplier ?? "n/a"}`
  ];

  if (alert.kind === "price_drop") {
    lines.push(
      `Price drop: -${formatPrice(alert.deltaNok ?? null)} (${(alert.deltaPercent ?? 0).toFixed(1)}%)`
    );
  }

  if (alert.kind === "rating_increase") {
    lines.push(`Rating increase: +${(alert.ratingDelta ?? 0).toFixed(1)}`);
  }

  const titleByKind: Record<AlertEvent["kind"], string> = {
    new_offer: "New travel deal",
    price_drop: "Price drop detected",
    rating_increase: "Offer quality improved"
  };

  const colorByKind: Record<AlertEvent["kind"], number> = {
    new_offer: 0x3498db,
    price_drop: 0x2ecc71,
    rating_increase: 0xf1c40f
  };

  return {
    title: titleByKind[alert.kind],
    url: alert.current.url,
    description: lines.join("\n"),
    color: colorByKind[alert.kind]
  };
}

export class DiscordService {
  constructor(
    private readonly webhookUrl: string | undefined,
    private readonly username: string
  ) {}

  async sendAlerts(alerts: AlertEvent[]): Promise<number> {
    if (alerts.length === 0 || !this.webhookUrl) {
      return 0;
    }

    const alertsBySearch = new Map<string, AlertEvent[]>();

    for (const alert of alerts) {
      const list = alertsBySearch.get(alert.search.id) ?? [];
      list.push(alert);
      alertsBySearch.set(alert.search.id, list);
    }

    for (const [searchId, searchAlerts] of alertsBySearch.entries()) {
      const searchName = searchAlerts[0]?.search.name ?? searchId;

      for (const batch of chunk(searchAlerts, 10)) {
        const payload: DiscordWebhookPayload = {
          username: this.username,
          content: `Travel alerts for "${searchName}"`,
          embeds: batch.map(embedForAlert)
        };

        const response = await fetch(this.webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const responseBody = await response.text();
          throw new Error(
            `Discord webhook failed with ${response.status} ${response.statusText}: ${responseBody.slice(
              0,
              500
            )}`
          );
        }
      }
    }

    return alerts.length;
  }
}
