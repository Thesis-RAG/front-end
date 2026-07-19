/** Shared date-formatting utilities. */

// Format an ISO date string to a short Vietnamese locale datetime string; returns "—" for null/undefined.
export const formatDate = (s?: string | null): string => {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
