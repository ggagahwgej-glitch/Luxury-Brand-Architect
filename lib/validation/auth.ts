import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(160),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  /**
   * Optional at the schema level: whether it is mandatory depends on
   * OWNER_ACCESS_CODE (enforced in the route). When supplied it must be exactly
   * 12 digits, so a typo can never be silently ignored.
   */
  code: z
    .string()
    .trim()
    .regex(/^\d{12}$/, "The owner access code must be exactly 12 digits")
    .optional()
    .or(z.literal("")),
});

export type LoginInput = z.input<typeof loginSchema>;
