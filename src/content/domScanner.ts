import {
  CHUNK_MAX_LENGTH,
  CHUNK_MIN_LENGTH,
  CONSENT_BLOCK_MIN_LENGTH,
  CONSENT_MARKERS
} from "../shared/constants";
import type { ConsentBlock, ConsentCategory, TextChunk } from "./types";

const IGNORED_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "SVG",
  "CANVAS",
  "IFRAME",
  "TEMPLATE"
]);

const SUBMIT_WORDS = /\b(submit|apply|continue|checkout|pay|purchase|sign up|register|create account|send)\b/i;
const CHECKBOX_SELECTOR = 'input[type="checkbox"], input[type="radio"], [role="checkbox"]';
const LEGAL_MARKER_REGEX = new RegExp(
  CONSENT_MARKERS.map((marker) => escapeRegExp(marker)).join("|"),
  "i"
);

type ExtractConsentBlockOptions = {
  pageUrl: string;
  domain: string;
  enabledCategories: ConsentCategory[];
};

export function scanVisibleText(root: HTMLElement = document.body): TextChunk[] {
  const chunks: TextChunk[] = [];
  const seen = new Set<string>();

  collectStructuredChunks(root, chunks, seen);
  collectPageChunks(root, chunks, seen);

  return chunks.sort((a, b) => b.priority - a.priority);
}

export function extractConsentBlocks(
  root: HTMLElement = document.body,
  options: ExtractConsentBlockOptions
): ConsentBlock[] {
  const candidates = new Map<string, ConsentBlock>();

  collectExplicitContainers(root).forEach((element, index) => {
    addCandidate(candidates, element, `container-${index}`, "form", 5, options);
  });

  collectMarkerParents(root).forEach((element, index) => {
    addCandidate(candidates, element, `marker-${index}`, inferSource(element), 3, options);
  });

  collectCheckboxAdjacentBlocks(root).forEach((element, index) => {
    addCandidate(candidates, element, `checkbox-${index}`, "checkbox-adjacent", 5, options);
  });

  collectSubmitAdjacentBlocks(root).forEach((element, index) => {
    addCandidate(candidates, element, `submit-${index}`, "button-adjacent", 6, options);
  });

  return Array.from(candidates.values()).sort((a, b) => {
    const rankA = a.priority * 100 + a.markerCount * 12 + Math.min(a.text.length / 80, 25);
    const rankB = b.priority * 100 + b.markerCount * 12 + Math.min(b.text.length / 80, 25);
    return rankB - rankA;
  });
}

function collectStructuredChunks(root: HTMLElement, chunks: TextChunk[], seen: Set<string>): void {
  const forms = Array.from(root.querySelectorAll("form"));
  forms.forEach((form, index) => {
    const text = getVisibleTextFromElement(form);
    pushSplitChunks(chunks, seen, `form-${index}`, text, "form", 4);
  });

  const dialogs = Array.from(
    root.querySelectorAll('[role="dialog"], [aria-modal="true"], dialog, .modal, [class*="modal"]')
  );
  dialogs.forEach((dialog, index) => {
    const text = getVisibleTextFromElement(dialog);
    pushSplitChunks(chunks, seen, `dialog-${index}`, text, "dialog", 4);
  });

  const labelsAndFieldText = Array.from(
    root.querySelectorAll("label, legend, fieldset, [aria-describedby], [aria-labelledby]")
  );
  labelsAndFieldText.forEach((element, index) => {
    const text = getVisibleTextFromElement(element);
    pushSplitChunks(chunks, seen, `field-${index}`, text, "form", 3);
  });

  const buttons = Array.from(
    root.querySelectorAll('button, input[type="submit"], input[type="button"], a, [role="button"]')
  );

  buttons.forEach((button, index) => {
    const buttonText =
      button instanceof HTMLInputElement ? button.value : button.textContent?.trim() ?? "";
    if (!SUBMIT_WORDS.test(buttonText)) return;

    const nearbyText = getNearbyText(button);
    pushSplitChunks(chunks, seen, `button-${index}`, nearbyText, "button-adjacent", 5);
  });
}

function collectExplicitContainers(root: HTMLElement): Element[] {
  return Array.from(
    root.querySelectorAll(
      'form, fieldset, [role="dialog"], [aria-modal="true"], dialog, .modal, [class*="modal"], section, article'
    )
  ).filter((element) => {
    const text = getVisibleTextFromElement(element);
    return isMeaningfulConsentText(text);
  });
}

function collectMarkerParents(root: HTMLElement): Element[] {
  const parents = new Set<Element>();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = normalizeText(node.textContent ?? "");
      const parent = node.parentElement;
      if (!parent || !text || !LEGAL_MARKER_REGEX.test(text)) return NodeFilter.FILTER_REJECT;
      if (!isVisibleElement(parent) || isIgnoredElement(parent)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  while (walker.nextNode()) {
    const parent = walker.currentNode.parentElement;
    const container = parent ? findConsentContainer(parent) : undefined;
    if (container) parents.add(container);
  }

  return Array.from(parents);
}

function collectCheckboxAdjacentBlocks(root: HTMLElement): Element[] {
  return Array.from(root.querySelectorAll(CHECKBOX_SELECTOR))
    .flatMap((element) => collectNearbyElements(element))
    .filter((element) => isMeaningfulConsentText(getVisibleTextFromElement(element)));
}

function collectSubmitAdjacentBlocks(root: HTMLElement): Element[] {
  return Array.from(
    root.querySelectorAll('button, input[type="submit"], input[type="button"], a, [role="button"]')
  )
    .filter((button) => {
      const buttonText =
        button instanceof HTMLInputElement ? button.value : button.textContent?.trim() ?? "";
      return SUBMIT_WORDS.test(buttonText);
    })
    .flatMap((element) => collectNearbyElements(element))
    .filter((element) => isMeaningfulConsentText(getVisibleTextFromElement(element)));
}

function addCandidate(
  candidates: Map<string, ConsentBlock>,
  element: Element,
  id: string,
  source: ConsentBlock["source"],
  priority: number,
  options: ExtractConsentBlockOptions
): void {
  const text = normalizeText(getVisibleTextFromElement(element));
  if (!isMeaningfulConsentText(text)) return;

  const markers = getConsentMarkers(text);
  const signature = normalizeText(text).toLowerCase().slice(0, 360);
  const existing = candidates.get(signature);
  const block: ConsentBlock = {
    id,
    text,
    source,
    priority,
    markerCount: markers.length,
    markers,
    pageUrl: options.pageUrl,
    domain: options.domain,
    enabledCategories: options.enabledCategories
  };

  if (!existing || block.priority + block.markerCount > existing.priority + existing.markerCount) {
    candidates.set(signature, block);
  }
}

function findConsentContainer(start: Element): Element {
  let best = start;
  let current: Element | null = start;

  for (let depth = 0; depth < 5 && current; depth += 1) {
    const text = getVisibleTextFromElement(current);
    const markers = getConsentMarkers(text);
    if (isMeaningfulConsentText(text)) {
      best = current;
      if (text.length >= CONSENT_BLOCK_MIN_LENGTH && markers.length >= 2) break;
    }

    const parent: HTMLElement | null = current.parentElement;
    if (!parent || parent === document.body || parent === document.documentElement) break;

    const parentText = getVisibleTextFromElement(parent);
    if (parentText.length > 5000 && text.length < 1200) break;
    current = parent;
  }

  return best;
}

function collectNearbyElements(element: Element): Element[] {
  const candidates = new Set<Element>();
  let current: Element | null = element;

  for (let depth = 0; depth < 5 && current; depth += 1) {
    candidates.add(current);
    if (current.previousElementSibling) candidates.add(current.previousElementSibling);
    if (current.nextElementSibling) candidates.add(current.nextElementSibling);
    current = current.parentElement;
  }

  return Array.from(candidates);
}

function collectPageChunks(root: HTMLElement, chunks: TextChunk[], seen: Set<string>): void {
  const visibleTextNodes: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = normalizeText(node.textContent ?? "");
      if (text.length < 3) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent || !isVisibleElement(parent)) return NodeFilter.FILTER_REJECT;
      if (isIgnoredElement(parent)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  while (walker.nextNode()) {
    visibleTextNodes.push(normalizeText(walker.currentNode.textContent ?? ""));
  }

  pushSplitChunks(chunks, seen, "page", visibleTextNodes.join(" "), "page", 1);
}

function getNearbyText(element: Element): string {
  const candidates = new Set<Element>();
  let current: Element | null = element;

  for (let depth = 0; depth < 4 && current; depth += 1) {
    candidates.add(current);
    if (current.previousElementSibling) candidates.add(current.previousElementSibling);
    if (current.nextElementSibling) candidates.add(current.nextElementSibling);
    current = current.parentElement;
  }

  return Array.from(candidates)
    .map((candidate) => getVisibleTextFromElement(candidate))
    .filter(Boolean)
    .join(" ");
}

function getVisibleTextFromElement(element: Element): string {
  if (!isVisibleElement(element)) return "";

  const pieces: string[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || !isVisibleElement(parent) || isIgnoredElement(parent)) {
        return NodeFilter.FILTER_REJECT;
      }
      const text = normalizeText(node.textContent ?? "");
      return text ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });

  while (walker.nextNode()) {
    pieces.push(normalizeText(walker.currentNode.textContent ?? ""));
  }

  if (element instanceof HTMLInputElement && element.value) {
    pieces.push(element.value);
  }

  return normalizeText(pieces.join(" "));
}

function pushSplitChunks(
  chunks: TextChunk[],
  seen: Set<string>,
  idPrefix: string,
  rawText: string,
  source: TextChunk["source"],
  priority: number
): void {
  const text = normalizeText(rawText);
  if (!text) return;

  splitText(text).forEach((chunkText, index) => {
    const signature = chunkText.toLowerCase().slice(0, 240);
    if (seen.has(signature)) return;
    seen.add(signature);
    chunks.push({
      id: `${idPrefix}-${index}`,
      text: chunkText,
      source,
      priority
    });
  });
}

function splitText(text: string): string[] {
  if (text.length <= CHUNK_MAX_LENGTH) return [text];

  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  sentences.forEach((sentence) => {
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length > CHUNK_MAX_LENGTH && current.length >= CHUNK_MIN_LENGTH) {
      chunks.push(current);
      current = sentence;
      return;
    }

    if (next.length > CHUNK_MAX_LENGTH) {
      chunks.push(next.slice(0, CHUNK_MAX_LENGTH));
      current = next.slice(CHUNK_MAX_LENGTH);
      return;
    }

    current = next;
  });

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function isMeaningfulConsentText(text: string): boolean {
  const markers = getConsentMarkers(text);
  return markers.length >= 2 || (text.length >= CONSENT_BLOCK_MIN_LENGTH && markers.length >= 1);
}

function getConsentMarkers(text: string): string[] {
  const lower = text.toLowerCase();
  return CONSENT_MARKERS.filter((marker) => lower.includes(marker.toLowerCase()));
}

function inferSource(element: Element): ConsentBlock["source"] {
  if (element.closest("form")) return "form";
  if (element.closest('[role="dialog"], [aria-modal="true"], dialog, .modal, [class*="modal"]')) {
    return "dialog";
  }
  if (element.closest(CHECKBOX_SELECTOR)) return "checkbox-adjacent";
  return "page";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isIgnoredElement(element: Element): boolean {
  if (IGNORED_TAGS.has(element.tagName)) return true;
  return Boolean(element.closest("[data-consentlens-root]"));
}

function isVisibleElement(element: Element): boolean {
  if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) return true;
  if (isIgnoredElement(element)) return false;

  const style = window.getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0" ||
    element.getAttribute("aria-hidden") === "true"
  ) {
    return false;
  }

  const htmlElement = element as HTMLElement;
  if (htmlElement.hidden) return false;

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}
