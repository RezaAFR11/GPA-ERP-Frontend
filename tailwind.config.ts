import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
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
        surface:  "var(--surface)",
        "surface-2": "var(--surface-2)",
        canvas:   "var(--canvas)",
        "canvas-tint": "var(--canvas-tint)",
        // Sidebar (Garuda Navy)
        sidebar: {
          DEFAULT: "var(--sidebar)",
          hover:   "var(--sidebar-hover)",
          active:  "var(--sidebar-active)",
          border:  "var(--sidebar-border)",
          text:    "var(--sidebar-text)",
          heading: "var(--sidebar-heading)",
        },
        // Foreground
        fg: {
          1: "var(--fg-1)",
          2: "var(--fg-2)",
          3: "var(--fg-3)",
          4: "var(--fg-4)",
        },
        // Borders
        border: {
          DEFAULT: "var(--border)",
          strong:  "var(--border-strong)",
          cool:    "var(--border-cool)",
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
        xs:    "var(--shadow-xs)",
        card:  "var(--shadow-card)",
        "card-md": "var(--shadow-md)",
        pop:   "var(--shadow-pop)",
        modal: "var(--shadow-modal)",
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
