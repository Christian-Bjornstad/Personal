import { AlertEvent } from "./diff-engine";
import { formatDateTime } from "../utils/dates";

interface DiscordField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  title: string;
  url?: string;
  description?: string;
  color?: number;
  fields?: DiscordField[];
  image?: { url: string };
  thumbnail?: { url: string };
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
  if (value === null) return "n/a";
  return `${new Intl.NumberFormat("nb-NO").format(value)} NOK`;
}

function isValidUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function embedForAlert(alert: AlertEvent): DiscordEmbed {
  const fields: DiscordField[] = [
    {
      name: "💰 Pris",
      value: `**${formatPrice(alert.current.totalPrice)}**\n(${formatPrice(
        alert.current.pricePerPerson
      )} per pers)`,
      inline: true
    },
    {
      name: "📅 Datoer",
      value: `${formatDateTime(alert.current.departureDate)}\n-> ${formatDateTime(
        alert.current.returnDate
      )}\n(${alert.current.nights} netter)`,
      inline: true
    },
    {
      name: "⭐ Vurdering",
      value: `${alert.current.rating ? alert.current.rating + " ⭐" : "n/a"}\n(${
        alert.current.guestRating ?? "Ingen"
      }/10 hos gjester)`,
      inline: true
    }
  ];

  const weatherParts: string[] = [];
  if (alert.current.tempAir) weatherParts.push(`🌡️ Luft: ${alert.current.tempAir}°C`);
  if (alert.current.tempWater) weatherParts.push(`🌊 Vann: ${alert.current.tempWater}°C`);

  if (weatherParts.length > 0) {
    fields.push({
      name: "☀️ Vær (forventet)",
      value: weatherParts.join("\n"),
      inline: true
    });
  }

  const distanceParts: string[] = [];
  if (alert.current.distanceBeach !== null) {
    distanceParts.push(`🏖️ Strand: ${alert.current.distanceBeach}m`);
  }
  if (alert.current.distanceCentre !== null) {
    distanceParts.push(`🏘️ Sentrum: ${alert.current.distanceCentre}m`);
  }

  if (distanceParts.length > 0) {
    fields.push({
      name: "📍 Beliggenhet",
      value: distanceParts.join("\n"),
      inline: true
    });
  }

  fields.push({
    name: "🏢 Leverandør",
    value: alert.current.supplier ?? "n/a",
    inline: true
  });

  if (alert.kind === "price_drop") {
    fields.push({
      name: "📉 Prisnedgang!",
      value: `**-${formatPrice(alert.deltaNok ?? null)}** (${(alert.deltaPercent ?? 0).toFixed(1)}%)`,
      inline: false
    });
  }

  const titleByKind: Record<AlertEvent["kind"], string> = {
    new_offer: "✨ Nytt reisekupp funnet!",
    price_drop: "🔥 Prisen har sunket!",
    rating_increase: "📈 Bedre kvalitet tilgjengelig!"
  };

  const colorByKind: Record<AlertEvent["kind"], number> = {
    new_offer: 0x3498db, // Blue
    price_drop: 0x2ecc71, // Green
    rating_increase: 0xf1c40f // Yellow
  };

  const embed: DiscordEmbed = {
    title: `${titleByKind[alert.kind]}: ${alert.current.title}`.slice(0, 256),
    description: `Destinasjon: **${alert.current.destination ?? "Ukjent"}**\nSøk: *${
      alert.search.name
    }*`.slice(0, 2048),
    color: colorByKind[alert.kind],
    fields: fields.map((f) => ({
      name: f.name.slice(0, 256),
      value: f.value.slice(0, 1024),
      inline: f.inline
    }))
  };

  if (isValidUrl(alert.current.url)) {
    embed.url = alert.current.url;
  }

  if (isValidUrl(alert.current.hotelImage)) {
    embed.image = { url: alert.current.hotelImage! };
  }

  return embed;
}

export class DiscordService {
  constructor(
    private readonly webhookUrl: string | undefined,
    private readonly username: string
  ) {}

  async sendSummary(summary: { enabledSearches: number; succeededSearches: number }): Promise<void> {
    if (!this.webhookUrl) {
      return;
    }

    const payload: DiscordWebhookPayload = {
      username: this.username,
      content: `✅ Travel search completed. Checked ${summary.enabledSearches} searches. No new offers or price drops worth reporting right now.`
    };

    const response = await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Discord summary failed: ${response.status} ${body}`);
    }
  }

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

      // Using a smaller batch size (5) to stay well within Discord's total character limit per message (6000)
      for (const batch of chunk(searchAlerts, 5)) {
        const payload: DiscordWebhookPayload = {
          username: this.username,
          content: `Travel alerts for "${searchName}"`.slice(0, 2000),
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
          console.error("Discord Payload that failed:", JSON.stringify(payload, null, 2));
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
