import type { ConsentAnalysis, ConsentCategory } from "../content/types";
import { ALL_CATEGORIES, STORAGE_KEYS } from "./constants";
import { getRiskLevel } from "./scoring";

export type ConsentLensSettings = {
  enabledCategories: ConsentCategory[];
  ignoredDomains: string[];
  dismissedUntilReload: string[];
};

export const DEFAULT_SETTINGS: ConsentLensSettings = {
  enabledCategories: ALL_CATEGORIES,
  ignoredDomains: [],
  dismissedUntilReload: []
};

type StorageShape = {
  [STORAGE_KEYS.settings]?: Partial<ConsentLensSettings>;
  [STORAGE_KEYS.lastAnalysis]?: Partial<ConsentAnalysis>;
};

function hasChromeStorage(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

export async function getSettings(): Promise<ConsentLensSettings> {
  if (!hasChromeStorage()) return DEFAULT_SETTINGS;

  const result = (await chrome.storage.local.get(STORAGE_KEYS.settings)) as StorageShape;
  const saved = result[STORAGE_KEYS.settings] ?? {};

  return {
    enabledCategories: saved.enabledCategories ?? DEFAULT_SETTINGS.enabledCategories,
    ignoredDomains: saved.ignoredDomains ?? DEFAULT_SETTINGS.ignoredDomains,
    dismissedUntilReload: saved.dismissedUntilReload ?? DEFAULT_SETTINGS.dismissedUntilReload
  };
}

export async function saveSettings(settings: ConsentLensSettings): Promise<void> {
  if (!hasChromeStorage()) return;
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings });
}

export async function updateSettings(
  updater: (settings: ConsentLensSettings) => ConsentLensSettings
): Promise<ConsentLensSettings> {
  const current = await getSettings();
  const next = updater(current);
  await saveSettings(next);
  return next;
}

export async function isDomainIgnored(domain: string): Promise<boolean> {
  const settings = await getSettings();
  return settings.ignoredDomains.some((ignored) => ignored.toLowerCase() === domain.toLowerCase());
}

export async function ignoreDomain(domain: string): Promise<ConsentLensSettings> {
  return updateSettings((settings) => ({
    ...settings,
    ignoredDomains: Array.from(new Set([...settings.ignoredDomains, domain.toLowerCase()])).sort()
  }));
}

export async function removeIgnoredDomain(domain: string): Promise<ConsentLensSettings> {
  return updateSettings((settings) => ({
    ...settings,
    ignoredDomains: settings.ignoredDomains.filter(
      (ignored) => ignored.toLowerCase() !== domain.toLowerCase()
    )
  }));
}

export async function setLastAnalysis(analysis: ConsentAnalysis): Promise<void> {
  if (!hasChromeStorage()) return;
  await chrome.storage.local.set({ [STORAGE_KEYS.lastAnalysis]: normalizeConsentAnalysis(analysis) });
}

export async function getLastAnalysis(): Promise<ConsentAnalysis | undefined> {
  if (!hasChromeStorage()) return undefined;
  const result = (await chrome.storage.local.get(STORAGE_KEYS.lastAnalysis)) as StorageShape;
  return normalizeConsentAnalysis(result[STORAGE_KEYS.lastAnalysis]);
}

export function normalizeConsentAnalysis(
  analysis: Partial<ConsentAnalysis> | undefined
): ConsentAnalysis | undefined {
  if (!analysis) return undefined;

  const score =
    typeof analysis.score === "number"
      ? analysis.score
      : typeof analysis.totalScore === "number"
        ? normalizeLegacyScore(analysis.totalScore)
        : 0;
  const riskLevel = analysis.riskLevel ?? getRiskLevel(score);
  const categories = analysis.categories ?? [];
  const matches = analysis.matches ?? [];
  const sourceSnippets = analysis.sourceSnippets ?? matches.map((match) => match.snippet);
  const fallbackBullets = buildFallbackBullets(analysis);
  const youMayBeAgreeingTo = normalizeBullets(
    analysis.youMayBeAgreeingTo ?? analysis.importantPoints ?? analysis.bullets ?? fallbackBullets
  );
  const requiredBullets =
    (analysis.detected ?? score > 0) && youMayBeAgreeingTo.length === 0
      ? fallbackBullets
      : youMayBeAgreeingTo;
  const summaryLine =
    analysis.summaryLine ??
    analysis.summary ??
    (analysis.detected
      ? "ConsentLens found agreement language worth reviewing before you continue."
      : "No meaningful consent block was found in the visible page text.");

  return {
    pageUrl: analysis.pageUrl ?? "",
    domain: analysis.domain ?? "",
    detected: analysis.detected ?? score > 0,
    riskLevel,
    score,
    totalScore: analysis.totalScore ?? score,
    categories,
    summaryLine,
    summary: analysis.summary ?? summaryLine,
    youMayBeAgreeingTo: requiredBullets,
    importantPoints: requiredBullets,
    bullets: analysis.bullets ?? requiredBullets,
    sourceSnippets,
    sourceText: analysis.sourceText ?? "",
    confidence: analysis.confidence ?? 0,
    matches
  };
}

function normalizeBullets(value: string[] | undefined): string[] {
  return Array.isArray(value)
    ? Array.from(new Set(value.map((item) => item.trim()).filter(Boolean))).slice(0, 7)
    : [];
}

function buildFallbackBullets(analysis: Partial<ConsentAnalysis>): string[] {
  const categories = new Set(analysis.categories ?? []);
  const snippets = [
    ...(analysis.sourceSnippets ?? []),
    ...((analysis.matches ?? []).map((match) => `${match.phrase} ${match.snippet}`)),
    analysis.sourceText ?? ""
  ]
    .join(" ")
    .toLowerCase();
  const bullets: string[] = [];

  if (categories.has("Background Verification") || includesAny(snippets, ["verify", "background check"])) {
    bullets.push("The company may verify information you submitted.");
  }
  if (includesAny(snippets, ["former employers", "educational institutions", "references", "schools"])) {
    bullets.push("Former employers, schools, or references may be contacted.");
  }
  if (includesAny(snippets, ["without prior notice", "without notice"])) {
    bullets.push("Information may be requested or released without prior notice to you.");
  }
  if (categories.has("Liability Waiver") || includesAny(snippets, ["release", "liability"])) {
    bullets.push("You may be releasing the company or information providers from liability.");
  }
  if (categories.has("Employment Terms") || includesAny(snippets, ["at-will", "terminated at any time"])) {
    bullets.push("If hired, employment may be at-will and can end at any time.");
  }
  if (includesAny(snippets, ["misstatement", "omission", "rejection", "termination"])) {
    bullets.push("Incorrect or omitted information may lead to rejection or termination.");
  }
  if (categories.has("Data Sharing") || includesAny(snippets, ["third parties", "personal information"])) {
    bullets.push("Your personal information may be shared with outside parties.");
  }

  return normalizeBullets(
    bullets.length ? bullets : ["This may be standard language, but it is still meaningful consent."]
  );
}

function includesAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value));
}

function normalizeLegacyScore(score: number): number {
  if (score <= 0) return 0;
  if (score <= 10) return Math.min(100, Math.max(1, Math.round(score * 10)));
  return Math.min(100, Math.max(1, Math.round(score)));
}
