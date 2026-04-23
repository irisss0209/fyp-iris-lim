export function formatTime(
  dateString: string,
  format: "12h" | "24h"
) {
  const date = new Date(dateString);

  return date.toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: format === "12h"
  });
}

export function formatClockTime(
  value: string,
  format: "12h" | "24h"
) {
  if (!value) return value;

  // Handles values like "13:45" or "13:45:00" from the API.
  const match = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    const date = new Date();
    date.setHours(Number(match[1]), Number(match[2]), Number(match[3] ?? "0"), 0);
    return date.toLocaleTimeString("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: format === "12h"
    });
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: format === "12h"
    });
  }

  return value;
}

export function formatDateTimeLabel(
  value: string,
  format: "12h" | "24h"
) {
  if (!value) return value;

  // Handles labels like "7 Apr 2026, 13:45" by replacing only the time suffix.
  const match = value.match(/(\d{1,2}:\d{2}(?::\d{2})?)$/);
  if (!match) return value;

  const formattedTime = formatClockTime(match[1], format);
  return value.replace(match[1], formattedTime);
}
