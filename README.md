# ConsentLens

A free browser extension that catches hidden consent before you click submit.

ConsentLens is a free browser extension that helps people notice hidden consent language before they click submit.

It detects clauses like:

- background verification
- liability waivers
- arbitration
- data sharing
- auto-renewals
- employment acknowledgements

It does not provide legal advice. It simply helps users slow down and understand what they may be agreeing to.

## What V1 Does

ConsentLens scans visible page text, with extra attention to forms, labels, dialog text, and text near submit, apply, continue, checkout, and payment buttons.

When important terms are detected, it shows a small floating warning card with:

- risk level: Low, Medium, or High
- category chips
- short plain-English bullets
- original phrase snippets
- actions to show details, dismiss, or ignore the site

V1 is fully local and rules-based. It does not call an LLM or backend service.

## Detection Categories

- Background Verification
- Data Sharing
- Liability Waiver
- Legal Rights
- Employment Terms
- Financial Commitment
- Privacy Tracking
- General Consent

## Project Structure

```text
src/
  manifest.ts
  content/
    index.ts
    domScanner.ts
    classifier.ts
    overlay.ts
    types.ts
  popup/
    Popup.tsx
  options/
    Options.tsx
  shared/
    storage.ts
    patterns.ts
    scoring.ts
    constants.ts
```

The classifier uses a pluggable interface so an optional AI explanation layer can be added later without replacing DOM scanning, scoring, popup, options, or storage.

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

The production extension is written to `dist/`.

## Load in Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `dist/` directory.

## Local Development

```bash
npm run dev
```

For extension testing, a production build loaded from `dist/` is the most reliable path because Chrome expects the generated MV3 manifest and content script file names.

## Privacy

ConsentLens V1 runs locally in the browser. It stores category settings, ignored domains, and the latest page analysis in `chrome.storage.local`.

It does not provide legal advice and does not claim that any clause is illegal.
