import { AREA_UNIT_LABELS } from "@/lib/constants";
import type { AreaUnit, Property } from "@/lib/types";

const CURRENCY_LOCALE: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  AED: "en-AE",
  SGD: "en-SG",
};

export function formatCurrency(
  amount: number | null | undefined,
  currency = "INR",
  opts: { compact?: boolean } = {},
) {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "Price on request";
  const locale = CURRENCY_LOCALE[currency] ?? "en-IN";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
      notation: opts.compact && amount >= 10_000_000 ? "compact" : "standard",
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString(locale)}`;
  }
}

export function formatPriceSuffix(property: Pick<Property, "purpose" | "price">) {
  if (property.purpose === "rent") return " / month";
  return "";
}

export function formatArea(value: number | null | undefined, unit: AreaUnit) {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) return null;
  const formatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
  return `${formatted} ${AREA_UNIT_LABELS[unit]}`;
}

export function formatDate(value: string | Date, opts: Intl.DateTimeFormatOptions = {}) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...opts,
  }).format(date);
}

export function formatDateTime(value: string | Date) {
  return formatDate(value, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(date.getTime())) return "—";
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/** Builds a wa.me link with a pre-filled, URL-encoded message. */
export function whatsappLink(rawNumber: string, message?: string) {
  const digits = rawNumber.replace(/[^\d]/g, "");
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function telLink(rawPhone: string) {
  const cleaned = rawPhone.replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : null;
}
