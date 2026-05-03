import type { ConsentCategory } from "../content/types";

export const APP_NAME = "ConsentLens";
export const TAGLINE =
  "A free browser extension that catches hidden consent before you click submit.";

export const STORAGE_KEYS = {
  settings: "consentlens:settings",
  lastAnalysis: "consentlens:lastAnalysis"
} as const;

export const ALL_CATEGORIES: ConsentCategory[] = [
  "Background Verification",
  "Data Sharing",
  "Liability Waiver",
  "Legal Rights",
  "Employment Terms",
  "Financial Commitment",
  "Privacy Tracking",
  "General Consent"
];

export const DETECTION_THRESHOLD = 3;
export const MAX_MATCHES = 8;
export const CHUNK_MIN_LENGTH = 500;
export const CHUNK_MAX_LENGTH = 1200;
