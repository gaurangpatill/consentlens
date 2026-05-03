import type { ConsentAnalysis, ConsentCategory } from "../content/types";
import { ALL_CATEGORIES, STORAGE_KEYS } from "./constants";

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
  [STORAGE_KEYS.lastAnalysis]?: ConsentAnalysis;
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
  await chrome.storage.local.set({ [STORAGE_KEYS.lastAnalysis]: analysis });
}

export async function getLastAnalysis(): Promise<ConsentAnalysis | undefined> {
  if (!hasChromeStorage()) return undefined;
  const result = (await chrome.storage.local.get(STORAGE_KEYS.lastAnalysis)) as StorageShape;
  return result[STORAGE_KEYS.lastAnalysis];
}
