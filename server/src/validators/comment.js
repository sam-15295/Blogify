import { z } from "zod";
import { text } from "./common.js";

export const createCommentSchema = z.object({
  content: text("Comment")
    .trim()
    .min(1, "Comment can't be empty")
    .max(1000, "Comment must be at most 1,000 characters"),
});
