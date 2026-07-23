import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const themeInitializer = `
  (function () {
    try {
      var root = document.documentElement;
      localStorage.removeItem("gpa_theme");
      root.classList.remove("dark");
      root.dataset.theme = "light";
      root.style.colorScheme = "light";
    } catch (_) {}
  })();
`;

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets:  ["latin"],
  weight:   ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display:  "swap",
});

const robotoMono = Roboto_Mono({
  subsets:  ["latin"],
  weight:   ["400", "500", "600"],
  variable: "--font-roboto-mono",
  display:  "swap",
});

export const metadata: Metadata = {
  title:       { default: "GPA Cost Control", template: "%s · GPA ERP" },
  description: "Construction Cost Control ERP — Multi-project expense management",
  manifest:    "/manifest.json",
  appleWebApp: {
    capable:       true,
    title:         "GPA ERP",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor:   "#021B33",
  width:        "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${robotoMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="font-sans bg-canvas antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
