import { z } from "zod";
import { INQUIRY_INTENTS } from "@/lib/types";

/** Accepts +91 98640 21000, 098640-21000, (986) 402 1000 … */
const phonePattern = /^\+?[\d][\d\s().-]{6,19}$/;

export const inquirySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your full name")
    .max(80, "Name is too long")
    .refine((value) => /[a-zA-Z\u00C0-\u024F\u0900-\u097F]/.test(value), "Please enter a valid name"),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter a contact number")
    .max(20, "Phone number is too long")
    .regex(phonePattern, "Please enter a valid phone number")
    .refine((value) => value.replace(/\D/g, "").length >= 7, "Please enter a valid phone number"),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address").max(160),
  message: z
    .string()
    .trim()
    .min(10, "Please tell us a little more (at least 10 characters)")
    .max(2000, "Message is too long"),
  intent: z.enum(INQUIRY_INTENTS).default("information"),
  propertyId: z
    .string()
    .uuid("Unknown property reference")
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  /** Honeypot — must stay empty. */
  company: z.string().max(0).optional().default(""),
  /** Milliseconds the visitor spent on the form; instant submissions are bots. */
  elapsedMs: z.number().int().nonnegative().optional(),
});

export type InquiryParsed = z.output<typeof inquirySchema>;
