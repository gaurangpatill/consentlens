import { scanVisibleText } from "./domScanner";
import { RuleBasedConsentClassifier } from "./classifier";
import { ConsentLensOverlay } from "./overlay";
import type { ConsentAnalysis, ConsentMessage } from "./types";
import { getSettings, ignoreDomain, isDomainIgnored, setLastAnalysis } from "../shared/storage";

const classifier = new RuleBasedConsentClassifier();
const overlay = new ConsentLensOverlay();
let currentAnalysis: ConsentAnalysis | undefined;
let dismissedForUrl: string | undefined;
let scanTimer: number | undefined;
let observer: MutationObserver | undefined;

void initialize();

async function initialize(): Promise<void> {
  if (!document.body || !isSupportedPage()) return;

  await runScan();
  setupMutationObserver();
  setupRuntimeMessages();
}

async function runScan(): Promise<ConsentAnalysis | undefined> {
  const domain = getDomain();
  if (!domain || (await isDomainIgnored(domain))) {
    overlay.remove();
    currentAnalysis = buildEmptyAnalysis(domain);
    await setLastAnalysis(currentAnalysis);
    return currentAnalysis;
  }

  const settings = await getSettings();
  const chunks = scanVisibleText();
  currentAnalysis = classifier.analyze(chunks, {
    pageUrl: window.location.href,
    domain,
    enabledCategories: settings.enabledCategories
  });

  await setLastAnalysis(currentAnalysis);

  if (currentAnalysis.detected && dismissedForUrl !== window.location.href) {
    overlay.show(currentAnalysis, {
      onDismiss: () => {
        dismissedForUrl = window.location.href;
        overlay.remove();
      },
      onIgnoreSite: () => {
        void ignoreCurrentSite();
      }
    });
  } else {
    overlay.remove();
  }

  return currentAnalysis;
}

function setupMutationObserver(): void {
  observer?.disconnect();
  observer = new MutationObserver(() => {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(() => {
      void runScan();
    }, 900);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

function setupRuntimeMessages(): void {
  chrome.runtime.onMessage.addListener((message: ConsentMessage, _sender, sendResponse) => {
    if (!message?.type?.startsWith("CONSENTLENS_")) return false;

    void handleMessage(message).then(sendResponse);
    return true;
  });
}

async function handleMessage(message: ConsentMessage): Promise<ConsentAnalysis | { ok: true }> {
  if (message.type === "CONSENTLENS_GET_ANALYSIS") {
    return currentAnalysis ?? (await runScan()) ?? buildEmptyAnalysis(getDomain());
  }

  if (message.type === "CONSENTLENS_RESCAN") {
    dismissedForUrl = undefined;
    return (await runScan()) ?? buildEmptyAnalysis(getDomain());
  }

  if (message.type === "CONSENTLENS_DISMISS") {
    dismissedForUrl = window.location.href;
    overlay.remove();
    return { ok: true };
  }

  if (message.type === "CONSENTLENS_IGNORE_SITE") {
    await ignoreCurrentSite();
    return { ok: true };
  }

  return { ok: true };
}

async function ignoreCurrentSite(): Promise<void> {
  const domain = getDomain();
  if (!domain) return;
  await ignoreDomain(domain);
  overlay.remove();
  currentAnalysis = buildEmptyAnalysis(domain);
  await setLastAnalysis(currentAnalysis);
}

function buildEmptyAnalysis(domain: string): ConsentAnalysis {
  return {
    pageUrl: window.location.href,
    domain,
    detected: false,
    riskLevel: "low",
    totalScore: 0,
    categories: [],
    summary: "No important consent terms were detected on the visible page.",
    bullets: ["No notable agreement language was found in visible page text."],
    matches: []
  };
}

function getDomain(): string {
  return window.location.hostname.replace(/^www\./i, "").toLowerCase();
}

function isSupportedPage(): boolean {
  return /^https?:$/i.test(window.location.protocol);
}
