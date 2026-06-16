/** Parse FastAPI / API error bodies into a user-friendly string. */
export function parseApiError(
  data: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (!data || typeof data !== "object") return fallback;
  const detail = (data as { detail?: unknown }).detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg: string }).msg);
        }
        return null;
      })
      .filter(Boolean);
    if (messages.length > 0) return messages.join(". ");
  }

  return fallback;
}
