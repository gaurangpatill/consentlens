import { AlertTriangle, EyeOff, RotateCw, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import type { ConsentAnalysis, ConsentMessage } from "../content/types";
import { APP_NAME, TAGLINE } from "../shared/constants";
import { getLastAnalysis } from "../shared/storage";

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
      const analysis = await sendTabMessage<ConsentAnalysis>(tab.id, {
        type: "CONSENTLENS_GET_ANALYSIS"
      });
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
    const analysis = await sendTabMessage<ConsentAnalysis>(state.activeTabId, {
      type: "CONSENTLENS_RESCAN"
    });
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

  return (
    <section className="panel">
      <div className="status-row">
        <p className="status-title">
          {analysis.detected ? "Important terms detected" : "No important terms detected"}
        </p>
        <span className={`risk-pill ${analysis.riskLevel}`}>{capitalize(analysis.riskLevel)}</span>
      </div>
      <p className="muted">{analysis.summary}</p>

      {analysis.categories.length > 0 && (
        <div className="chip-list">
          {analysis.categories.map((category) => (
            <span className="chip" key={category}>
              {category}
            </span>
          ))}
        </div>
      )}

      <ul className="bullet-list">
        {analysis.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>

      {showMatches && (
        <div className="match-list">
          {analysis.matches.map((match) => (
            <article className="match" key={`${match.category}-${match.phrase}-${match.snippet}`}>
              <strong>{match.phrase}</strong>
              <p>{match.snippet}</p>
            </article>
          ))}
        </div>
      )}

      <div className="actions">
        <button
          className="secondary-button"
          type="button"
          onClick={() => setShowMatches((value) => !value)}
          disabled={!analysis.matches.length}
        >
          <AlertTriangle size={15} />
          {showMatches ? "Hide details" : "Show details"}
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

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
