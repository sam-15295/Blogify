import { z } from "zod";
import { paginationQuery } from "./common.js";

const title = z.string().trim().min(3).max(150);
const body = z.string().trim().min(10).max(20000);

export const createBlogSchema = z.object({ title, body });

export const updateBlogSchema = z
  .object({ title: title.optional(), body: body.optional() })
  .refine((data) => data.title !== undefined || data.body !== undefined, {
    message: "Provide at least one of: title, body",
  });

export const listBlogsQuery = paginationQuery.extend({
  q: z.string().trim().min(1).max(100).optional(),
});
