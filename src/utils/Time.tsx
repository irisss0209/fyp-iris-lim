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