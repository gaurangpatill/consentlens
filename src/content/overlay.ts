import type { ConsentAnalysis } from "./types";

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
    card.setAttribute("aria-label", "ConsentLens found important terms");

    const header = document.createElement("div");
    header.className = "header";

    const titleGroup = document.createElement("div");
    const eyebrow = document.createElement("div");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "ConsentLens";
    const title = document.createElement("h2");
    title.textContent = "ConsentLens found important terms";
    titleGroup.append(eyebrow, title);

    const risk = document.createElement("span");
    risk.className = "risk";
    risk.textContent = `${analysis.score}/100`;
    header.append(titleGroup, risk);

    const summary = document.createElement("p");
    summary.className = "summary";
    summary.textContent = analysis.summaryLine;

    const chips = document.createElement("div");
    chips.className = "chips";
    analysis.categories.slice(0, 4).forEach((category) => {
      const chip = document.createElement("span");
      chip.textContent = category;
      chips.appendChild(chip);
    });

    const bullets = document.createElement("ul");
    bullets.className = "bullets";
    analysis.importantPoints.slice(0, 3).forEach((bulletText) => {
      const bullet = document.createElement("li");
      bullet.textContent = bulletText;
      bullets.appendChild(bullet);
    });

    const snippets = document.createElement("div");
    snippets.className = "snippets";
    if (this.expanded) {
      analysis.sourceSnippets.slice(0, 5).forEach((snippetText) => {
        snippets.appendChild(this.createSnippet(snippetText));
      });
    }

    const actions = document.createElement("div");
    actions.className = "actions";

    const details = document.createElement("button");
    details.type = "button";
    details.className = "primary";
    details.textContent = this.expanded ? "Hide source" : "View source";
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
    card.append(header, summary, chips);
    if (bullets.children.length > 0) {
      card.append(bullets);
    }
    if (this.expanded) {
      card.append(snippets);
    }
    card.append(actions);
    return card;
  }

  private createSnippet(snippetText: string): HTMLElement {
    const snippet = document.createElement("div");
    snippet.className = "snippet";

    const text = document.createElement("p");
    text.textContent = snippetText;

    snippet.append(text);
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
        border-top: 4px solid #2f7d4f;
        border-radius: 8px;
        box-shadow: 0 18px 50px rgba(24, 24, 21, 0.18);
        padding: 16px;
        color: #24241f;
      }

      .risk-medium {
        border-top-color: #c08a1e;
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
        border: 1px solid #c6decf;
        border-radius: 8px;
        color: #245b38;
        font-size: 17px;
        font-weight: 820;
        line-height: 1;
        padding: 8px 9px;
        background: #eaf5ed;
      }

      .risk-medium .risk {
        background: #fff4d8;
        border-color: #edd089;
        color: #7a4a09;
      }

      .risk-high .risk {
        background: #fae7e2;
        border-color: #ecc2b8;
        color: #8b3428;
      }

      .summary {
        color: #34322c;
        font-size: 13px;
        line-height: 1.4;
        margin: 0 0 12px;
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
        background: #245b38;
        border-color: #245b38;
        color: #ffffff;
      }

      .risk-medium .primary {
        background: #7a4a09;
        border-color: #7a4a09;
      }

      .risk-high .primary {
        background: #8b3428;
        border-color: #8b3428;
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
