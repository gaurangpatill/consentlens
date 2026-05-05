# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Vite dev server (popup/options UI preview only)
npm run build      # Full extension build: TypeScript check + two Vite passes
npm run preview    # Preview the production build
```

The build runs **twice**: once via `vite.config.ts` (popup + options pages) and once via `vite.content.config.ts` (content script as IIFE). Output lands in `dist/`. Load `dist/` as an unpacked Chrome extension to test.

No test framework is configured.

## Architecture

ConsentLens is a Chrome Manifest V3 extension with three runtime contexts:

### Content Script (`src/content/`)
Injected into every page at `document_idle`. Runs the full scan-analyze-display pipeline:
1. `domScanner.ts` — walks the DOM to extract candidate consent blocks (forms, dialogs, checkbox labels, button-adjacent text). A block must be ≥300 chars or have 2+ consent markers to qualify.
2. `classifier.ts` — scores each block via `RuleBasedAnalyzer` (default) or `LlmConsentAnalyzer` (opt-in via `USE_LLM_ANALYZER=true` env var + `LLM_ANALYZER_ENDPOINT`). Produces a 1–100 score and risk level (low/medium/high).
3. `clauseSummarizer.ts` — extracts trigger-matched bullets from the top block.
4. `overlay.ts` — renders a floating card into a Shadow DOM (so page styles can't interfere).

A `MutationObserver` with a 900 ms debounce rescans on DOM changes. Cross-frame analysis is aggregated: child frames post results up, the top frame merges them.

### Popup (`src/popup/Popup.tsx`)
React UI shown when clicking the extension icon. Sends `CONSENTLENS_GET_ANALYSIS` to the content script and displays the cached `ConsentAnalysis`. Falls back to `chrome.storage.local` (`consentlens:lastAnalysis`) when the active tab has no content script (e.g., `chrome://` pages).

### Options Page (`src/options/Options.tsx`)
React settings UI. Lets users toggle the 8 detection categories and manage ignored domains. Persisted to `chrome.storage.local` under `consentlens:settings`.

### Manifest (`src/manifest.ts`)
TypeScript module; the Vite plugin in `vite.config.ts` imports it and writes `dist/manifest.json` at build time.

## Key Concepts

**Detection categories** (defined in `src/content/patterns.ts`): Background Verification, Data Sharing, Liability Waiver, Legal Rights, Employment Terms, Financial Commitment, Privacy Tracking, General Consent. Each has a phrase list and an explanation string.

**Scoring** (`src/content/scoring.ts`): score = sum of pattern match weights + category bonus. Thresholds: low 0–39, medium 40–69, high 70–100.

**Message protocol** (`src/shared/types.ts`): all `chrome.runtime` message types are prefixed `CONSENTLENS_` and typed as a discriminated union (`ConsentMessage`).

**Storage keys**: `consentlens:settings` and `consentlens:lastAnalysis` — both accessed through `src/shared/storage.ts`.

**Overlay isolation**: the overlay card is injected into a Shadow DOM host to prevent style bleed from the host page.

## Build Environment Variables

| Variable | Default | Effect |
|---|---|---|
| `USE_LLM_ANALYZER` | `false` | Switch classifier to `LlmConsentAnalyzer` |
| `LLM_ANALYZER_ENDPOINT` | — | URL for the LLM analysis endpoint |

These are injected at build time via Vite's `define` in `vite.config.ts`.
