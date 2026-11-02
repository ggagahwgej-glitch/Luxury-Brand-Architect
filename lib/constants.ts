import type {
  AccentPreset,
  AreaUnit,
  DisplayFontPreset,
  InquiryIntent,
  InquiryStatus,
  PropertyStatus,
  PropertyType,
  Purpose,
} from "@/lib/types";

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  villa: "Villa",
  apartment: "Apartment",
  penthouse: "Penthouse",
  independent_house: "Independent House",
  residential_plot: "Residential Plot",
  commercial_building: "Commercial Building",
  commercial_shop: "Commercial Shop",
  office: "Office",
  land: "Land",
  farmhouse: "Farmhouse",
  other: "Other",
};

export const PURPOSE_LABELS: Record<Purpose, string> = {
  sale: "For Sale",
  rent: "For Rent",
};

export const STATUS_LABELS: Record<PropertyStatus, string> = {
  available: "Available",
  under_offer: "Under Offer",
  sold: "Sold",
  rented: "Rented",
  unavailable: "Unavailable",
};

export const STATUS_TONES: Record<PropertyStatus, "gold" | "success" | "neutral" | "danger"> = {
  available: "success",
  under_offer: "gold",
  sold: "neutral",
  rented: "neutral",
  unavailable: "danger",
};

export const AREA_UNIT_LABELS: Record<AreaUnit, string> = {
  sqft: "sq ft",
  sqm: "sq m",
  sqyd: "sq yd",
  acre: "acres",
  hectare: "hectares",
};

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  new: "New",
  read: "Read",
  contacted: "Contacted",
  resolved: "Resolved",
};

export const INQUIRY_INTENT_LABELS: Record<InquiryIntent, string> = {
  information: "Request more information",
  callback: "Request a callback",
  visit: "Schedule a visit",
  availability: "Ask about availability",
};

/** Curated collections surfaced on the homepage and /categories. */
export interface CollectionDefinition {
  slug: string;
  title: string;
  description: string;
  types: PropertyType[];
  image: string;
}

export const COLLECTIONS: CollectionDefinition[] = [
  {
    slug: "luxury-villas",
    title: "Luxury Villas",
    description: "Private residences with landscaped grounds and considered architecture.",
    types: ["villa", "farmhouse"],
    image: "/seed/villa-exterior.jpg",
  },
  {
    slug: "premium-apartments",
    title: "Premium Apartments",
    description: "Serviced residences and full-floor addresses in prime districts.",
    types: ["apartment"],
    image: "/seed/apartment-tower.jpg",
  },
  {
    slug: "penthouses",
    title: "Penthouses",
    description: "Sky-level living with private terraces and uninterrupted outlooks.",
    types: ["penthouse"],
    image: "/seed/penthouse-view.jpg",
  },
  {
    slug: "independent-houses",
    title: "Independent Houses",
    description: "Standalone homes with generous plots and heritage detailing.",
    types: ["independent_house"],
    image: "/seed/heritage-house.jpg",
  },
  {
    slug: "commercial",
    title: "Commercial Properties",
    description: "Flagship retail, boutique offices and investment-grade assets.",
    types: ["commercial_building", "commercial_shop", "office"],
    image: "/seed/commercial-lobby.jpg",
  },
  {
    slug: "land",
    title: "Residential Land",
    description: "Cleared plots and development parcels with clear title.",
    types: ["residential_plot", "land"],
    image: "/seed/coastal-land.jpg",
  },
  {
    slug: "estates",
    title: "Premium Estates",
    description: "Estate-scale holdings with outbuildings and private grounds.",
    types: ["villa", "farmhouse"],
    image: "/seed/estate-aerial.jpg",
  },
];

export const ACCENT_PRESETS: Record<
  AccentPreset,
  { label: string; accent: string; soft: string; deep: string; swatch: string }
> = {
  imperial_gold: {
    label: "Imperial Gold",
    accent: "198 164 90",
    soft: "229 209 160",
    deep: "146 116 66",
    swatch: "#C6A45A",
  },
  champagne: {
    label: "Champagne Gold",
    accent: "229 209 160",
    soft: "244 240 231",
    deep: "178 154 106",
    swatch: "#E5D1A0",
  },
  bronze: {
    label: "Antique Bronze",
    accent: "176 129 74",
    soft: "214 176 124",
    deep: "120 84 44",
    swatch: "#B0814A",
  },
  platinum: {
    label: "Platinum",
    accent: "201 207 216",
    soft: "233 236 240",
    deep: "140 148 160",
    swatch: "#C9CFD8",
  },
};

export const DISPLAY_FONT_PRESETS: Record<DisplayFontPreset, { label: string; stack: string }> = {
  cormorant: { label: "Cormorant Garamond — Editorial", stack: '"Cormorant Garamond", Georgia, serif' },
  playfair: { label: "Playfair Display — Grand", stack: '"Playfair Display", Georgia, serif' },
};

export const AMENITY_SUGGESTIONS = [
  "Private Pool",
  "Landscaped Garden",
  "Home Cinema",
  "Gym & Wellness Suite",
  "Concierge Service",
  "24×7 Security",
  "Covered Parking",
  "Power Backup",
  "Elevator",
  "Clubhouse",
  "Kids' Play Area",
  "Spa",
  "Wine Cellar",
  "Staff Quarters",
  "Rainwater Harvesting",
  "Smart Home Automation",
];

export const FEATURE_SUGGESTIONS = [
  "Double-height Living Room",
  "Floor-to-ceiling Glazing",
  "Imported Marble Flooring",
  "Designer Modular Kitchen",
  "Private Terrace",
  "Sea / Hill View",
  "Corner Plot",
  "Vastu Compliant",
  "Solar Ready",
  "EV Charging",
  "Pet Friendly",
  "Furnished",
];

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_VIDEO_BYTES = 64 * 1024 * 1024; // 64 MB
/**
 * Largest file that may be streamed through the app's own upload route.
 * Vercel caps serverless request bodies at ~4.5 MB, so anything larger must go
 * straight from the browser to Supabase Storage via a signed upload URL.
 */
export const MAX_PROXY_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB
export const MAX_IMAGES_PER_PROPERTY = 20;

export const PUBLIC_NAV = [
  { href: "/", label: "Home" },
  { href: "/properties", label: "Properties" },
  { href: "/buy", label: "Buy" },
  { href: "/rent", label: "Rent" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const ADMIN_NAV = [
  { href: "/admin/dashboard", label: "Overview", icon: "LayoutDashboard" },
  { href: "/admin/properties", label: "Properties", icon: "Building2" },
  { href: "/admin/inquiries", label: "Inquiries", icon: "MessagesSquare" },
  { href: "/admin/media", label: "Media Library", icon: "Images" },
  { href: "/admin/settings", label: "Website Settings", icon: "Settings2" },
] as const;

/**
 * Business timezone for every displayed date/time. Kept here (not in
 * lib/config/site) so date formatting can be imported by client components
 * without pulling server environment code into the browser bundle.
 */
export const SITE_TIME_ZONE = "Asia/Kolkata";
