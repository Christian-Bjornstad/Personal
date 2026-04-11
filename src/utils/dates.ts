export function formatDateTime(value: string | null): string {
  if (!value) {
    return "n/a";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(date);
}

export function formatDate(value: string | null): string {
  if (!value) {
    return "n/a";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return formatDateTime(value);
}

export function nowIso(): string {
  return new Date().toISOString();
}

