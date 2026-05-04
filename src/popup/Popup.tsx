import { Eye, EyeOff, RotateCw, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import type { ConsentAnalysis, ConsentMessage } from "../content/types";
import { APP_NAME, TAGLINE } from "../shared/constants";
import { getLastAnalysis, normalizeConsentAnalysis } from "../shared/storage";

type PopupState =
  | { status: "loading" }
  | { status: "ready"; analysis: ConsentAnalysis; activeTabId?: number }
  | { status: "unsupported"; message: string };

export function Popup() {
  const [state, setState] = useState<PopupState>({ status: "loading" });

  useEffect(() => {
    void loadActiveAnalysis();
  }, []);

  async function loadActiveAnalysis(): Promise<void> {
    setState({ status: "loading" });
    const tab = await getActiveTab();
    if (!tab?.id || !tab.url || !/^https?:\/\//i.test(tab.url)) {
      const fallback = await getLastAnalysis();
      if (fallback) {
        setState({ status: "ready", analysis: fallback });
        return;
      }
      setState({ status: "unsupported", message: "ConsentLens runs on regular web pages." });
      return;
    }

    try {
      const analysis = normalizeConsentAnalysis(
        await sendTabMessage<Partial<ConsentAnalysis>>(tab.id, {
          type: "CONSENTLENS_GET_ANALYSIS"
        })
      );
      if (!analysis) {
        setState({ status: "unsupported", message: "Refresh this page to start scanning." });
        return;
      }
      setState({ status: "ready", analysis, activeTabId: tab.id });
    } catch {
      const fallback = await getLastAnalysis();
      if (fallback) {
        setState({ status: "ready", analysis: fallback, activeTabId: tab.id });
        return;
      }
      setState({ status: "unsupported", message: "Refresh this page to start scanning." });
    }
  }

  async function rescan(): Promise<void> {
    if (state.status !== "ready" || !state.activeTabId) return;
    setState({ status: "loading" });
    const analysis = normalizeConsentAnalysis(
      await sendTabMessage<Partial<ConsentAnalysis>>(state.activeTabId, {
        type: "CONSENTLENS_RESCAN"
      })
    );
    if (!analysis) {
      setState({ status: "unsupported", message: "Refresh this page to start scanning." });
      return;
    }
    setState({ status: "ready", analysis, activeTabId: state.activeTabId });
  }

  async function ignoreSite(): Promise<void> {
    if (state.status !== "ready" || !state.activeTabId) return;
    await sendTabMessage<{ ok: true }>(state.activeTabId, { type: "CONSENTLENS_IGNORE_SITE" });
    await loadActiveAnalysis();
  }

  return (
    <main className="app-shell popup-shell">
      <header className="topbar">
        <div className="brand">
          <h1>{APP_NAME}</h1>
          <p>{TAGLINE}</p>
        </div>
        <button
          className="icon-button"
          type="button"
          title="Open options"
          aria-label="Open options"
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          <Settings size={16} />
        </button>
      </header>

      {state.status === "loading" && (
        <section className="panel">
          <div className="status-row">
            <p className="status-title">Scanning visible page text</p>
            <RotateCw size={16} />
          </div>
          <p className="muted">ConsentLens checks the page locally in your browser.</p>
        </section>
      )}

      {state.status === "unsupported" && (
        <section className="panel">
          <div className="status-row">
            <p className="status-title">No page status</p>
            <span className="risk-pill">Local only</span>
          </div>
          <p className="muted">{state.message}</p>
        </section>
      )}

      {state.status === "ready" && (
        <AnalysisView analysis={state.analysis} onRescan={rescan} onIgnoreSite={ignoreSite} />
      )}

      <p className="footer-note">
        ConsentLens does not provide legal advice. It highlights language you may want to read
        before continuing.
      </p>
    </main>
  );
}

function AnalysisView({
  analysis,
  onRescan,
  onIgnoreSite
}: {
  analysis: ConsentAnalysis;
  onRescan: () => Promise<void>;
  onIgnoreSite: () => Promise<void>;
}) {
  const [showMatches, setShowMatches] = useState(false);
  const pointCount = analysis.importantPoints.length;

  return (
    <section className="panel">
      <div className="score-row">
        <div>
          <p className="status-title">
            {analysis.detected ? "Important terms found" : "No consent block found"}
          </p>
          <p className="summary-line">{analysis.summaryLine}</p>
        </div>
        <span className={`score-badge ${analysis.riskLevel}`}>
          <strong>{analysis.score}</strong>
          <span>/100</span>
        </span>
      </div>

      {analysis.categories.length > 0 && (
        <div className="chip-list">
          {analysis.categories.map((category) => (
            <span className="chip" key={category}>
              {category}
            </span>
          ))}
        </div>
      )}

      <p className="points-title">{pointCount} important points:</p>
      <ul className="bullet-list">
        {analysis.importantPoints.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>

      {showMatches && (
        <>
          <div className="match-list">
            {analysis.sourceSnippets.map((snippet) => (
              <article className="match" key={snippet}>
                <p>{snippet}</p>
              </article>
            ))}
          </div>
          {analysis.sourceText && (
            <details className="source-details">
              <summary>View full source text</summary>
              <p>{analysis.sourceText}</p>
            </details>
          )}
        </>
      )}

      <div className="actions">
        <button
          className="secondary-button"
          type="button"
          onClick={() => setShowMatches((value) => !value)}
          disabled={!analysis.sourceSnippets.length && !analysis.sourceText}
        >
          <Eye size={15} />
          {showMatches ? "Hide source" : "View source text"}
        </button>
        <button className="secondary-button" type="button" onClick={onRescan}>
          <RotateCw size={15} />
          Rescan
        </button>
        <button className="danger-button" type="button" onClick={onIgnoreSite}>
          <EyeOff size={15} />
          Ignore site
        </button>
      </div>
    </section>
  );
}

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function sendTabMessage<T>(tabId: number, message: ConsentMessage): Promise<T> {
  return chrome.tabs.sendMessage(tabId, message) as Promise<T>;
}
