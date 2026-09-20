import { z } from "zod";
import { text } from "./common.js";

const email = text("Email").trim().toLowerCase().email("Enter a valid email address");

// bcrypt only uses the first 72 BYTES, not characters. Emoji and accented letters take several bytes,
// so a longer password would be silently truncated and give a false sense of security.
const password = text("Password")
  .min(8, "Password must be at least 8 characters")
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password is too long (72 bytes at most)");

export const registerSchema = z.object({
  fullName: text("Full name")
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(60, "Full name must be at most 60 characters"),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: text("Password").min(1, "Password is required").max(128, "Password is too long"),
});
