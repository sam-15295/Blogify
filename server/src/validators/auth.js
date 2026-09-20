import { z } from "zod";

// bcrypt only hashes the first 72 bytes, so longer passwords give a false sense of security.
const password = z.string().min(8, "Password must be at least 8 characters").max(72);

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email(),
  password,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(72),
});
