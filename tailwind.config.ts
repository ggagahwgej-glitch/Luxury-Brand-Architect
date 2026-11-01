import type { Config } from "tailwindcss";

/**
 * Centralised design tokens for the Royal Midnight Luxury system.
 * Colours that can be themed at runtime (accent) resolve from CSS variables
 * so the Owner Studio can change the accent without a rebuild.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: "#090B10",
        imperial: "#08090D",
        navy: { DEFAULT: "#101827", light: "#16203099" },
        charcoal: "#171A22",
        burgundy: "#351820",
        ivory: "#F4F0E7",
        silver: "#A9ADB7",
        success: "#3F9B76",
        danger: "#C45B5B",
        gold: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          soft: "rgb(var(--accent-soft) / <alpha-value>)",
          deep: "rgb(var(--accent-deep) / <alpha-value>)",
          champagne: "#E5D1A0",
          imperial: "#C6A45A",
          antique: "#927442",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Cormorant Garamond", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["clamp(2.9rem, 7vw, 6.6rem)", { lineHeight: "0.98", letterSpacing: "-0.02em" }],
        "display-lg": ["clamp(2.3rem, 4.6vw, 4rem)", { lineHeight: "1.04", letterSpacing: "-0.015em" }],
        "display-md": ["clamp(1.9rem, 3.2vw, 2.85rem)", { lineHeight: "1.1", letterSpacing: "-0.01em" }],
        "display-sm": ["clamp(1.5rem, 2.2vw, 1.9rem)", { lineHeight: "1.15" }],
        eyebrow: ["0.6875rem", { lineHeight: "1", letterSpacing: "0.34em" }],
      },
      // Full 0–100 opacity scale so `/12`, `/8`, `/92` etc. all resolve.
      opacity: Object.fromEntries(
        Array.from({ length: 101 }, (_, index) => [index, String(index / 100)]),
      ) as Record<string, string>,
      letterSpacing: {
        luxe: "0.18em",
        wider2: "0.28em",
      },
      maxWidth: {
        shell: "1440px",
        prose2: "68ch",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        30: "7.5rem",
      },
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "3px",
        md: "3px",
        lg: "4px",
        xl: "5px",
        "2xl": "6px",
        full: "999px",
      },
      boxShadow: {
        card: "0 24px 60px -32px rgba(0,0,0,0.85)",
        lift: "0 40px 90px -40px rgba(0,0,0,0.9)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.05)",
        glow: "0 0 0 1px rgb(var(--accent) / 0.35), 0 20px 60px -30px rgb(var(--accent) / 0.35)",
      },
      transitionTimingFunction: {
        luxe: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translate3d(0, 24px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "ken-burns": {
          "0%": { transform: "scale(1.06) translate3d(0,0,0)" },
          "100%": { transform: "scale(1.16) translate3d(-1.2%, -1.4%, 0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-700px 0" },
          "100%": { backgroundPosition: "700px 0" },
        },
        "line-grow": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.9s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.8s ease-out both",
        "ken-burns": "ken-burns 24s ease-out both",
        shimmer: "shimmer 1.8s linear infinite",
        "line-grow": "line-grow 1.1s cubic-bezier(0.22, 1, 0.36, 1) both",
        "spin-slow": "spin-slow 1.1s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
