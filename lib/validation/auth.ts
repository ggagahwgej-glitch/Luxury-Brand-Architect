import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(160),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  code: z
    .string()
    .trim()
    .regex(/^\d{12}$/, "The owner access code must be exactly 12 digits"),
});

export type LoginInput = z.input<typeof loginSchema>;
