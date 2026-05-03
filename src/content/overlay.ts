import type { ConsentAnalysis, ConsentFinding } from "./types";

type OverlayCallbacks = {
  onDismiss: () => void;
  onIgnoreSite: () => void;
};

export class ConsentLensOverlay {
  private host?: HTMLDivElement;
  private shadow?: ShadowRoot;
  private expanded = false;

  show(analysis: ConsentAnalysis, callbacks: OverlayCallbacks): void {
    this.ensureRoot();
    if (!this.shadow) return;

    this.shadow.replaceChildren(this.createStyles(), this.createCard(analysis, callbacks));
  }

  remove(): void {
    this.host?.remove();
    this.host = undefined;
    this.shadow = undefined;
    this.expanded = false;
  }

  private ensureRoot(): void {
    if (this.host?.isConnected && this.shadow) return;

    this.host = document.createElement("div");
    this.host.dataset.consentlensRoot = "true";
    this.host.setAttribute("aria-live", "polite");
    this.shadow = this.host.attachShadow({ mode: "open" });
    document.documentElement.appendChild(this.host);
  }

  private createCard(analysis: ConsentAnalysis, callbacks: OverlayCallbacks): HTMLElement {
    const card = document.createElement("section");
    card.className = `card risk-${analysis.riskLevel}`;
    card.setAttribute("aria-label", "ConsentLens detected important terms");

    const header = document.createElement("div");
    header.className = "header";

    const titleGroup = document.createElement("div");
    const eyebrow = document.createElement("div");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "ConsentLens";
    const title = document.createElement("h2");
    title.textContent = "ConsentLens detected important terms";
    titleGroup.append(eyebrow, title);

    const risk = document.createElement("span");
    risk.className = "risk";
    risk.textContent = `${capitalize(analysis.riskLevel)} risk`;
    header.append(titleGroup, risk);

    const chips = document.createElement("div");
    chips.className = "chips";
    analysis.categories.slice(0, 4).forEach((category) => {
      const chip = document.createElement("span");
      chip.textContent = category;
      chips.appendChild(chip);
    });

    const bullets = document.createElement("ul");
    bullets.className = "bullets";
    analysis.bullets.slice(0, 4).forEach((bulletText) => {
      const bullet = document.createElement("li");
      bullet.textContent = bulletText;
      bullets.appendChild(bullet);
    });

    const snippets = document.createElement("div");
    snippets.className = "snippets";
    analysis.matches.slice(0, this.expanded ? 6 : 2).forEach((match) => {
      snippets.appendChild(this.createSnippet(match));
    });

    const actions = document.createElement("div");
    actions.className = "actions";

    const details = document.createElement("button");
    details.type = "button";
    details.className = "secondary";
    details.textContent = this.expanded ? "Hide details" : "Show details";
    details.addEventListener("click", () => {
      this.expanded = !this.expanded;
      this.show(analysis, callbacks);
    });

    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "secondary";
    dismiss.textContent = "Dismiss";
    dismiss.addEventListener("click", callbacks.onDismiss);

    const ignore = document.createElement("button");
    ignore.type = "button";
    ignore.className = "primary";
    ignore.textContent = "Ignore this site";
    ignore.addEventListener("click", callbacks.onIgnoreSite);

    actions.append(details, dismiss, ignore);
    card.append(header, chips, bullets, snippets, actions);
    return card;
  }

  private createSnippet(match: ConsentFinding): HTMLElement {
    const snippet = document.createElement("div");
    snippet.className = "snippet";

    const phrase = document.createElement("strong");
    phrase.textContent = match.phrase;

    const text = document.createElement("p");
    text.textContent = match.snippet;

    snippet.append(phrase, text);
    return snippet;
  }

  private createStyles(): HTMLStyleElement {
    const style = document.createElement("style");
    style.textContent = `
      :host {
        all: initial;
        position: fixed;
        z-index: 2147483647;
        right: 18px;
        bottom: 18px;
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      * {
        box-sizing: border-box;
        font-family: inherit;
      }

      .card {
        width: min(390px, calc(100vw - 28px));
        background: #fbfaf7;
        border: 1px solid #d8d2c7;
        border-top: 4px solid #6f7f6a;
        border-radius: 8px;
        box-shadow: 0 18px 50px rgba(24, 24, 21, 0.18);
        padding: 16px;
        color: #24241f;
      }

      .risk-medium {
        border-top-color: #b7791f;
      }

      .risk-high {
        border-top-color: #b14b3b;
      }

      .header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }

      .eyebrow {
        color: #6b6a60;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0;
        line-height: 1.2;
        margin-bottom: 3px;
      }

      h2 {
        color: #24241f;
        font-size: 16px;
        line-height: 1.25;
        margin: 0;
        font-weight: 740;
      }

      .risk {
        flex: 0 0 auto;
        border: 1px solid #d6d0c3;
        border-radius: 999px;
        color: #37352f;
        font-size: 12px;
        font-weight: 700;
        padding: 5px 8px;
        background: #ffffff;
      }

      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 12px;
      }

      .chips span {
        background: #ece7dc;
        border-radius: 999px;
        color: #4c493f;
        display: inline-flex;
        font-size: 12px;
        font-weight: 650;
        line-height: 1;
        padding: 6px 8px;
      }

      .bullets {
        display: grid;
        gap: 7px;
        margin: 0 0 12px;
        padding-left: 18px;
      }

      .bullets li {
        color: #34322c;
        font-size: 13px;
        line-height: 1.35;
        padding-left: 2px;
      }

      .snippets {
        display: grid;
        gap: 7px;
        margin-bottom: 14px;
      }

      .snippet {
        background: #ffffff;
        border: 1px solid #e3ded3;
        border-radius: 7px;
        padding: 9px 10px;
      }

      .snippet strong {
        color: #2f3d2b;
        display: block;
        font-size: 12px;
        line-height: 1.2;
        margin-bottom: 4px;
      }

      .snippet p {
        color: #555147;
        font-size: 12px;
        line-height: 1.35;
        margin: 0;
      }

      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }

      button {
        appearance: none;
        border: 1px solid #d4cec2;
        border-radius: 7px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 720;
        min-height: 32px;
        padding: 0 10px;
        white-space: nowrap;
      }

      button:hover {
        filter: brightness(0.98);
      }

      button:focus-visible {
        outline: 2px solid #315cbd;
        outline-offset: 2px;
      }

      .secondary {
        background: #ffffff;
        color: #37352f;
      }

      .primary {
        background: #2f3d2b;
        border-color: #2f3d2b;
        color: #ffffff;
      }

      @media (max-width: 420px) {
        :host {
          right: 10px;
          bottom: 10px;
        }

        .card {
          padding: 14px;
        }

        .actions {
          justify-content: stretch;
        }

        button {
          flex: 1;
          padding: 0 8px;
        }
      }
    `;
    return style;
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
