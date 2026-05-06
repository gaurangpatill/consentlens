import type { ConsentAnalysis, ConsentFinding, RiskLevel } from "../content/types";

export const SCORE: Record<RiskLevel, number> = {
  low: 1,
  medium: 3,
  high: 5
};

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function calculateScore(matches: ConsentFinding[]): number {
  const categories = new Set(matches.map((match) => match.category));
  const base = matches.reduce((sum, match) => sum + match.score, 0);
  const categoryBonus = Math.max(0, categories.size - 1);
  return base + categoryBonus;
}

export function clampRiskScore(score: number): number {
  return Math.max(1, Math.min(100, Math.round(score)));
}

export function buildSummary(analysis: Pick<ConsentAnalysis, "riskLevel" | "categories">): string {
  if (!analysis.categories.length) {
    return "No important consent terms were detected on the visible page.";
  }

  const categoryText =
    analysis.categories.length === 1
      ? analysis.categories[0]
      : `${analysis.categories.slice(0, 2).join(" and ")}${
          analysis.categories.length > 2 ? " terms" : ""
        }`;

  return `ConsentLens found ${analysis.riskLevel} risk ${categoryText.toLowerCase()} language on this page.`;
}

export function buildBullets(matches: ConsentFinding[]): string[] {
  if (!matches.length) {
    return ["No notable agreement language was found in visible page text."];
  }

  const bullets: string[] = [];
  const categories = new Set(matches.map((match) => match.category));

  if (categories.has("Background Verification")) {
    bullets.push(
      "You may be authorizing broad verification of personal, employment, or education information."
    );
  }
  if (categories.has("Data Sharing")) {
    bullets.push("Your personal information may be shared with outside parties.");
  }
  if (categories.has("Liability Waiver")) {
    bullets.push("You may be giving up some ability to hold another party responsible.");
  }
  if (categories.has("Legal Rights")) {
    bullets.push("You may be agreeing to limits on how disputes can be handled.");
  }
  if (categories.has("Financial Commitment")) {
    bullets.push("You may be agreeing to a payment, renewal, refund, or cancellation condition.");
  }
  if (categories.has("Employment Terms")) {
    bullets.push("You may be acknowledging employment terms that affect notice or termination.");
  }
  if (categories.has("Privacy Tracking")) {
    bullets.push("Your activity or device information may be used for analytics or advertising.");
  }
  if (categories.has("Content License")) {
    bullets.push("You may be granting the company a permanent license to use content you post or create.");
  }
  if (categories.has("Account Control")) {
    bullets.push("The company may restrict, suspend, or close your account at its discretion.");
  }

  if (bullets.length < 2) {
    bullets.push("This may be standard language, but it is still meaningful consent.");
  }

  return bullets.slice(0, 4);
}
