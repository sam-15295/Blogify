import { z } from "zod";

// A string field with human-readable messages. Without these, users would see Zod's internal wording
// such as "Invalid input: expected string, received undefined".
export const text = (label) =>
  z.string({ error: (issue) => (issue.input === undefined ? `${label} is required` : `${label} must be text`) });

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const idParams = z.object({ id: objectId });

export const paginationQuery = z.object({
  page: z.coerce.number("Page must be a number").int("Page must be a whole number").min(1, "Page must be at least 1").default(1),
  limit: z.coerce
    .number("Limit must be a number")
    .int("Limit must be a whole number")
    .min(1, "Limit must be at least 1")
    .max(50, "Limit can be at most 50")
    .default(10),
});
