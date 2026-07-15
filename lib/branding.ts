"use client";

import type { WorkspaceBranding } from "./types";

export const DEFAULT_BRANDING = {
  logo: "GP",
  title: "GPA",
  subtitle: "Cost Control",
};

export type Branding = WorkspaceBranding;

export function getBranding(): Branding {
  if (typeof window === "undefined") return DEFAULT_BRANDING;
  try {
    return { ...DEFAULT_BRANDING, ...JSON.parse(window.localStorage.getItem("gpa_branding") ?? "{}") };
  } catch {
    return DEFAULT_BRANDING;
  }
}

export function setBranding(branding: Branding) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("gpa_branding", JSON.stringify(branding));
  window.dispatchEvent(new Event("gpa_branding_changed"));
}
