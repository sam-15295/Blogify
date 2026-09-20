import { API_ORIGIN } from "../api/http.js";

// Images are either absolute URLs (Cloudinary) or local paths like /uploads/abc.png,
// which need the API origin in front when the API lives on another origin.
export const assetUrl = (path) => {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : `${API_ORIGIN}${path}`;
};

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
