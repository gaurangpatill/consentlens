import { Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { ConsentCategory } from "../content/types";
import { ALL_CATEGORIES, APP_NAME, TAGLINE } from "../shared/constants";
import {
  type ConsentLensSettings,
  getSettings,
  removeIgnoredDomain,
  saveSettings,
  updateSettings
} from "../shared/storage";

export function Options() {
  const [settings, setSettings] = useState<ConsentLensSettings | undefined>();
  const [domain, setDomain] = useState("");

  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);

  async function toggleCategory(category: ConsentCategory): Promise<void> {
    const next = await updateSettings((current) => {
      const enabled = new Set(current.enabledCategories);
      if (enabled.has(category)) {
        enabled.delete(category);
      } else {
        enabled.add(category);
      }

      return {
        ...current,
        enabledCategories: ALL_CATEGORIES.filter((item) => enabled.has(item))
      };
    });
    setSettings(next);
  }

  async function addDomain(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!settings) return;

    const normalized = normalizeDomain(domain);
    if (!normalized) return;

    const next = {
      ...settings,
      ignoredDomains: Array.from(new Set([...settings.ignoredDomains, normalized])).sort()
    };
    await saveSettings(next);
    setSettings(next);
    setDomain("");
  }

  async function removeDomain(domainToRemove: string): Promise<void> {
    const next = await removeIgnoredDomain(domainToRemove);
    setSettings(next);
  }

  return (
    <main className="app-shell">
      <div className="page-shell">
        <header className="topbar">
          <div className="brand">
            <h1>{APP_NAME}</h1>
            <p>{TAGLINE}</p>
          </div>
        </header>

        <section className="panel">
          <h2 className="section-title">Detection categories</h2>
          <p className="muted">Choose which rule groups ConsentLens scans for on web pages.</p>
          <div className="settings-list">
            {ALL_CATEGORIES.map((category) => (
              <label className="setting-row" key={category}>
                <span className="setting-copy">
                  <strong>{category}</strong>
                  <span className="muted">{categoryDescription(category)}</span>
                </span>
                <input
                  className="toggle"
                  type="checkbox"
                  checked={settings?.enabledCategories.includes(category) ?? false}
                  onChange={() => void toggleCategory(category)}
                  disabled={!settings}
                  aria-label={`Toggle ${category}`}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2 className="section-title">Ignored domains</h2>
          <p className="muted">ConsentLens will stay quiet on these sites.</p>

          <form className="input-row" onSubmit={(event) => void addDomain(event)}>
            <input
              type="text"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder="example.com"
              aria-label="Domain to ignore"
            />
            <button className="primary-button" type="submit" disabled={!domain.trim()}>
              <Plus size={15} />
              Add
            </button>
          </form>

          <div className="domain-list">
            {settings?.ignoredDomains.length ? (
              settings.ignoredDomains.map((ignoredDomain) => (
                <div className="domain-row" key={ignoredDomain}>
                  <code>{ignoredDomain}</code>
                  <button
                    className="icon-button"
                    type="button"
                    title={`Remove ${ignoredDomain}`}
                    aria-label={`Remove ${ignoredDomain}`}
                    onClick={() => void removeDomain(ignoredDomain)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            ) : (
              <p className="muted">No ignored domains yet.</p>
            )}
          </div>
        </section>

        <p className="footer-note">
          ConsentLens runs locally and does not provide legal advice. V1 uses rules only; the
          classifier boundary is ready for an optional explanation layer later.
        </p>
      </div>
    </main>
  );
}

function normalizeDomain(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withProtocol).hostname.replace(/^www\./i, "");
  } catch {
    return trimmed.replace(/^www\./i, "").replace(/\/.*$/, "");
  }
}

function categoryDescription(category: ConsentCategory): string {
  switch (category) {
    case "Background Verification":
      return "Checks for employment, education, reference, and background-check authorization.";
    case "Data Sharing":
      return "Checks for personal information sharing with partners or third parties.";
    case "Liability Waiver":
      return "Checks for release, waiver, and hold-harmless language.";
    case "Legal Rights":
      return "Checks for arbitration, class-action, jury-trial, and dispute terms.";
    case "Employment Terms":
      return "Checks for at-will and termination acknowledgements.";
    case "Financial Commitment":
      return "Checks for renewals, recurring charges, refunds, and cancellation terms.";
    case "Privacy Tracking":
      return "Checks for tracking, analytics, advertising, and device identifier language.";
    case "General Consent":
      return "Checks for broad agreement, acknowledgement, policy, and authorization phrases.";
  }
}
