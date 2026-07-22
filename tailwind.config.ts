import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand — Garuda Navy
        primary: {
          DEFAULT: "#06294A",
          50:  "#EEF3F8",
          100: "#D6E2EF",
          200: "#AEC6DD",
          300: "#7FA6C9",
          500: "#2D6CA0",
          600: "#134E7E",
          700: "#0A3A63",
          800: "#06294A",
          900: "#021B33",
        },
        // Brand — Garuda Gold
        accent: {
          DEFAULT: "#F2B713",
          dark:    "#CE9A08",
          light:   "#FCEAB0",
          50:      "#FEF8E6",
        },
        // Surfaces
        surface:  "#FFFFFF",
        "surface-2": "#F8FAF9",
        canvas:   "#F0EFEA",
        "canvas-tint": "#FAF8F4",
        // Sidebar (Garuda Navy)
        sidebar: {
          DEFAULT: "#021B33",
          hover:   "#06294A",
          active:  "#0A3A63",
          border:  "#0A2F52",
          text:    "#8FA8C2",
          heading: "#5C7795",
        },
        // Foreground
        fg: {
          1: "#0C2138",
          2: "#33445A",
          3: "#5E7186",
          4: "#94A3B8",
        },
        // Borders
        border: {
          DEFAULT: "#E7E5DF",
          strong:  "#D6D3CB",
          cool:    "#E2E8F0",
        },
        // Status colors — LOCKED SEMANTICS
        status: {
          approved:      "#16A34A",
          "approved-bg": "#F0FDF4",
          "approved-bd": "#BBF7D0",
          pending:       "#D97706",
          "pending-bg":  "#FFFBEB",
          "pending-bd":  "#FDE68A",
          rejected:      "#DC2626",
          "rejected-bg": "#FEF2F2",
          "rejected-bd": "#FECACA",
          submitted:     "#2563EB",
          "submitted-bg":"#EFF6FF",
          "submitted-bd":"#BFDBFE",
          verified:      "#0891B2",
          "verified-bg": "#ECFEFF",
          "verified-bd": "#A5F3FC",
          paid:          "#7C3AED",
          "paid-bg":     "#F5F3FF",
          "paid-bd":     "#DDD6FE",
          draft:         "#475569",
          "draft-bg":    "#F8FAFC",
          "draft-bd":    "#E2E8F0",
          locked:        "#0F172A",
          "locked-bg":   "#0F172A",
          active:        "#16A34A",
          "active-bg":   "#F0FDF4",
          critical:      "#DC2626",
          "critical-bg": "#FEF2F2",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["var(--font-roboto-mono)", "Roboto Mono", "JetBrains Mono", "Consolas", "monospace"],
      },
      boxShadow: {
        xs:    "0 1px 2px rgba(15,23,42,0.05)",
        card:  "0 2px 8px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
        "card-md": "0 4px 12px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.04)",
        pop:   "0 8px 24px rgba(15,23,42,0.12)",
        modal: "0 20px 60px -12px rgba(15,23,42,0.25)",
      },
      borderRadius: {
        xs:   "4px",
        sm:   "6px",
        md:   "8px",
        lg:   "12px",
        xl:   "16px",
        pill: "999px",
        badge: "999px",
      },
      animation: {
        "fade-in":       "fadeIn 0.15s ease-out",
        "slide-up":      "slideUp 0.2s ease-out",
        "slide-in-right":"slideInRight 0.25s ease-out",
        shimmer:         "shimmer 1.5s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%":   { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
