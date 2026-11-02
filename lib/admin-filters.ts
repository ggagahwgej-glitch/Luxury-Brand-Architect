import { PROPERTY_PURPOSES, PROPERTY_STATUSES, type PropertyStatus, type Purpose } from "@/lib/types";

/** Small typed guards for admin query strings. */
export const PROPERTY_SERVICES = {
  status(value: string | undefined): PropertyStatus | undefined {
    return value && (PROPERTY_STATUSES as readonly string[]).includes(value) ? (value as PropertyStatus) : undefined;
  },
  purpose(value: string | undefined): Purpose | undefined {
    return value && (PROPERTY_PURPOSES as readonly string[]).includes(value) ? (value as Purpose) : undefined;
  },
};
