import { API_ORIGIN } from "../api/http.js";

// Server returns image paths like /uploads/abc.png; in production the API lives on another origin.
export const assetUrl = (path) => (path ? `${API_ORIGIN}${path}` : null);

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

// Turns an axios error into something safe to show. Field errors come from the API's zod validation.
export function parseApiError(error) {
  const apiError = error?.response?.data?.error;
  if (!apiError) return { message: "Cannot reach the server. Please try again.", fields: {} };

  const fields = {};
  for (const detail of apiError.details ?? []) fields[detail.field] ??= detail.message;
  return { message: apiError.message, fields };
}
