import { z } from "zod";
import { paginationQuery, text } from "./common.js";

const title = text("Title")
  .trim()
  .min(3, "Title must be at least 3 characters")
  .max(150, "Title must be at most 150 characters");

const body = text("Body")
  .trim()
  .min(10, "Body must be at least 10 characters")
  .max(20000, "Body must be at most 20,000 characters");

export const createBlogSchema = z.object({ title, body });

// Every field is optional because a request may change only the cover image. The service rejects a
// request that changes nothing at all (it can see the uploaded file, which this schema cannot).
export const updateBlogSchema = z.object({ title: title.optional(), body: body.optional() });

export const listBlogsQuery = paginationQuery.extend({
  q: text("Search text")
    .trim()
    .min(1, "Search text can't be empty")
    .max(100, "Search text must be at most 100 characters")
    .optional(),
});
