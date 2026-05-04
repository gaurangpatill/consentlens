import { CONSENT_PATTERNS } from "../shared/patterns";
import { clampRiskScore, getRiskLevel, SCORE } from "../shared/scoring";
import type {
  ConsentAnalysis,
  ConsentAnalyzer,
  ConsentBlock,
  ConsentCategory,
  ConsentFinding,
  LlmConsentResponse,
  PatternRule,
  RiskLevel
} from "./types";
import { ALL_CATEGORIES } from "../shared/constants";

type CategorySignal = {
  category: ConsentCategory;
  severity: RiskLevel;
  phrases: string[];
  explanation: string;
  point: string;
};

const BLOCK_SIGNALS: CategorySignal[] = [
  ...CONSENT_PATTERNS.map((rule) => ({
    ...rule,
    point: pointForCategory(rule.category)
  })),
  {
    category: "Background Verification",
    severity: "high",
    phrases: ["verify", "investigate", "screening", "employment history", "education history"],
    explanation:
      "You may be authorizing verification of personal, employment, or education information.",
    point: "The company may verify statements or information you provided."
  },
  {
    category: "Data Sharing",
    severity: "medium",
    phrases: [
      "without prior notice",
      "without notice",
      "release information",
      "provide information",
      "consumer report",
      "outside parties"
    ],
    explanation: "Information may be requested from or shared with outside parties.",
    point: "Outside parties may be asked to provide or release information about you."
  },
  {
    category: "Liability Waiver",
    severity: "high",
    phrases: ["release", "liability", "claims", "damages", "hold harmless"],
    explanation:
      "You may be releasing one or more parties from responsibility for certain outcomes.",
    point: "You may be releasing the company or information providers from certain liability."
  },
  {
    category: "Employment Terms",
    severity: "medium",
    phrases: ["I understand", "employment", "if hired", "at will", "at-will"],
    explanation: "You may be acknowledging employment terms connected to the application.",
    point: "You may be acknowledging employment terms that apply if you are hired."
  }
];

export class RuleBasedConsentAnalyzer implements ConsentAnalyzer {
  async analyze(input: ConsentBlock): Promise<ConsentAnalysis> {
    const matches = dedupeMatches(findMatches(input));
    const categories = Array.from(new Set(matches.map((match) => match.category)));
    const score = scoreBlock(input, matches, categories);
    const riskLevel = getRiskLevel(score);
    const youMayBeAgreeingTo = buildAgreementBullets(input, matches);
    const sourceSnippets = buildSourceSnippets(input, matches);
    const summaryLine = buildSummaryLine(input, categories, matches);

    return {
      pageUrl: input.pageUrl,
      domain: input.domain,
      detected: true,
      riskLevel,
      score,
      totalScore: score,
      categories,
      summaryLine,
      summary: summaryLine,
      youMayBeAgreeingTo,
      importantPoints: youMayBeAgreeingTo,
      bullets: youMayBeAgreeingTo,
      sourceSnippets,
      sourceText: input.text,
      confidence: calculateConfidence(input, matches),
      matches
    };
  }
}

export class LlmConsentAnalyzer implements ConsentAnalyzer {
  async analyze(input: ConsentBlock): Promise<ConsentAnalysis> {
    const fallback = new RuleBasedConsentAnalyzer();
    if (!__LLM_ANALYZER_ENDPOINT__) return fallback.analyze(input);

    try {
      const response = await fetch(__LLM_ANALYZER_ENDPOINT__, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          consentBlock: input.text
        })
      });

      if (!response.ok) return fallback.analyze(input);

      const payload = normalizeLlmResponse((await response.json()) as Partial<LlmConsentResponse>);
      if (!payload) return fallback.analyze(input);

      const categories = payload.categories.filter(isConsentCategory);

      return {
        pageUrl: input.pageUrl,
        domain: input.domain,
        detected: true,
        riskLevel: payload.riskLevel,
        score: payload.score,
        totalScore: payload.score,
        categories,
        summaryLine: payload.summaryLine,
        summary: payload.summaryLine,
        youMayBeAgreeingTo: payload.youMayBeAgreeingTo,
        importantPoints: payload.youMayBeAgreeingTo,
        bullets: payload.youMayBeAgreeingTo,
        sourceSnippets: payload.sourceSnippets,
        sourceText: input.text,
        confidence: payload.confidence,
        matches: []
      };
    } catch {
      return fallback.analyze(input);
    }
  }
}

function findMatches(input: ConsentBlock): ConsentFinding[] {
  const findings: ConsentFinding[] = [];
  const lower = input.text.toLowerCase();

  BLOCK_SIGNALS.filter((signal) => input.enabledCategories.includes(signal.category)).forEach(
    (signal) => {
      signal.phrases.forEach((phrase) => {
        const index = lower.indexOf(phrase.toLowerCase());
        if (index === -1) return;

        findings.push({
          category: signal.category,
          severity: signal.severity,
          score: SCORE[signal.severity],
          phrase,
          explanation: signal.explanation,
          snippet: buildSnippet(input.text, index, phrase.length)
        });
      });
    }
  );

  return findings;
}

function scoreBlock(
  input: ConsentBlock,
  matches: ConsentFinding[],
  categories: ConsentCategory[]
): number {
  const categorySeverityPoints = categories.reduce((sum, category) => {
    const categoryMatches = matches.filter((match) => match.category === category);
    const hasHigh = categoryMatches.some((match) => match.severity === "high");
    const hasMedium = categoryMatches.some((match) => match.severity === "medium");
    const weight = hasHigh ? 12 : hasMedium ? 7 : 3;
    return sum + weight;
  }, 0);
  const categoryPoints = categories.length * 4;
  const markerPoints = Math.min(input.markerCount * 2, 10);
  const matchPoints = Math.min(matches.length, 8);
  const lengthPoints = input.text.length >= 1200 ? 6 : input.text.length >= 600 ? 4 : 2;
  const sourcePoints = input.source === "page" ? 0 : 4;
  const releaseAndVerificationBonus =
    categories.includes("Background Verification") && categories.includes("Liability Waiver")
      ? 5
      : 0;

  return clampRiskScore(
    8 +
      categorySeverityPoints +
      categoryPoints +
      markerPoints +
      matchPoints +
      lengthPoints +
      sourcePoints +
      releaseAndVerificationBonus
  );
}

function buildSummaryLine(
  input: ConsentBlock,
  categories: ConsentCategory[],
  matches: ConsentFinding[]
): string {
  const hasBackground = categories.includes("Background Verification");
  const hasDataSharing = categories.includes("Data Sharing");
  const hasLiability = categories.includes("Liability Waiver");
  const hasEmployment = categories.includes("Employment Terms");
  const hasLegalRights = categories.includes("Legal Rights");
  const hasFinancial = categories.includes("Financial Commitment");
  const text = input.text.toLowerCase();

  if (hasBackground && hasDataSharing) {
    return "You may be granting broad permission to verify your background and contact outside parties.";
  }

  if (hasBackground && hasLiability) {
    return "You may be authorizing verification while releasing some parties from verification-related liability.";
  }

  if (hasLegalRights) {
    return "You may be agreeing to limits on how disputes can be handled.";
  }

  if (hasFinancial) {
    return "You may be agreeing to payment, renewal, refund, or cancellation terms.";
  }

  if (hasEmployment) {
    return "You may be acknowledging employment terms that could matter if you are hired.";
  }

  if (hasDataSharing) {
    return "You may be agreeing that personal information can be shared with outside parties.";
  }

  if (matches.length || /\b(i agree|i acknowledge|i understand|terms|privacy)\b/i.test(text)) {
    return "This appears to be meaningful consent language that may affect what you are agreeing to.";
  }

  return "ConsentLens found agreement language worth reviewing before you continue.";
}

function buildAgreementBullets(input: ConsentBlock, matches: ConsentFinding[]): string[] {
  const categories = new Set(matches.map((match) => match.category));
  const lower = input.text.toLowerCase();
  const points: string[] = [];

  if (categories.has("Background Verification") || includesAny(lower, ["verify", "background check"])) {
    points.push("The company can verify statements you made in your application.");
  }

  if (
    includesAny(lower, [
      "former employers",
      "educational institutions",
      "references",
      "schools",
      "outside parties"
    ])
  ) {
    points.push("Former employers, schools, references, and other outside parties may be contacted.");
  }

  if (includesAny(lower, ["without prior notice", "without notice"])) {
    points.push("Information may be requested or released without prior notice to you.");
  }

  if (categories.has("Data Sharing")) {
    points.push("Your personal information may be shared with outside parties.");
  }

  if (categories.has("Liability Waiver") || includesAny(lower, ["release", "liability"])) {
    points.push("You may be releasing the company or information providers from certain liability.");
  }

  if (categories.has("Legal Rights")) {
    points.push("You may be agreeing to limits on how disputes can be handled.");
  }

  if (categories.has("Financial Commitment")) {
    points.push("You may be agreeing to renewal, payment, refund, or cancellation conditions.");
  }

  if (categories.has("Employment Terms") || includesAny(lower, ["at-will", "terminated at any time"])) {
    points.push("If hired, your employment may be at-will and can end at any time.");
  }

  if (
    includesAny(lower, [
      "misstatement",
      "misstatements",
      "omission",
      "omissions",
      "false statement",
      "falsification",
      "rejection",
      "termination"
    ])
  ) {
    points.push("Incorrect or omitted information may lead to rejection or termination.");
  }

  if (categories.has("Privacy Tracking")) {
    points.push("Your activity or device information may be used for analytics or advertising.");
  }

  if (points.length < 3) {
    matches.slice(0, 4).forEach((match) => {
      points.push(match.explanation);
    });
  }

  if (points.length < 3) {
    points.push("This may be standard language, but it is still meaningful consent.");
  }

  return Array.from(new Set(points)).slice(0, 7).slice(0, Math.max(3, Math.min(7, points.length)));
}

function buildSourceSnippets(input: ConsentBlock, matches: ConsentFinding[]): string[] {
  const snippets = matches.map((match) => match.snippet);

  if (!snippets.length) {
    return splitIntoSentences(input.text)
      .filter((sentence) => /\b(i agree|i acknowledge|i understand|i authorize|terms|privacy)\b/i.test(sentence))
      .slice(0, 4);
  }

  return Array.from(new Set(snippets)).slice(0, 6);
}

function calculateConfidence(input: ConsentBlock, matches: ConsentFinding[]): number {
  const markerConfidence = Math.min(input.markerCount * 0.12, 0.48);
  const matchConfidence = Math.min(matches.length * 0.05, 0.34);
  const sourceConfidence = input.source === "page" ? 0.04 : 0.12;
  return Math.min(0.96, Number((0.32 + markerConfidence + matchConfidence + sourceConfidence).toFixed(2)));
}

function dedupeMatches(matches: ConsentFinding[]): ConsentFinding[] {
  const seen = new Set<string>();
  const sorted = [...matches].sort((a, b) => b.score - a.score);
  const deduped: ConsentFinding[] = [];

  sorted.forEach((match) => {
    const key = `${match.category}:${normalizeComparable(match.phrase)}:${normalizeComparable(
      match.snippet
    ).slice(0, 140)}`;
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(match);
  });

  return deduped.slice(0, 12);
}

function buildSnippet(text: string, index: number, phraseLength: number): string {
  const start = Math.max(0, index - 110);
  const end = Math.min(text.length, index + phraseLength + 150);
  const prefix = start > 0 ? "... " : "";
  const suffix = end < text.length ? " ..." : "";
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function normalizeComparable(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeLlmResponse(
  response: Partial<LlmConsentResponse>
): LlmConsentResponse | undefined {
  const rawBullets = response.youMayBeAgreeingTo ?? response.importantPoints;
  const youMayBeAgreeingTo = Array.isArray(rawBullets)
    ? rawBullets
        .filter((point): point is string => typeof point === "string")
        .map((point) => point.trim())
        .filter(Boolean)
        .slice(0, 7)
    : [];

  if (
    typeof response.score !== "number" ||
    !["low", "medium", "high"].includes(response.riskLevel ?? "") ||
    typeof response.summaryLine !== "string" ||
    youMayBeAgreeingTo.length < 3 ||
    !Array.isArray(response.categories) ||
    !Array.isArray(response.sourceSnippets) ||
    typeof response.confidence !== "number"
  ) {
    return undefined;
  }

  return {
    score: clampRiskScore(response.score),
    riskLevel: getRiskLevel(clampRiskScore(response.score)),
    summaryLine: oneSentence(response.summaryLine),
    youMayBeAgreeingTo,
    importantPoints: youMayBeAgreeingTo,
    categories: response.categories.filter((category): category is string => typeof category === "string"),
    sourceSnippets: response.sourceSnippets
      .filter((snippet): snippet is string => typeof snippet === "string")
      .map((snippet) => snippet.trim())
      .filter(Boolean)
      .slice(0, 6),
    confidence: Math.max(0, Math.min(1, Number(response.confidence.toFixed(2))))
  };
}

function oneSentence(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^.*?[.!?](?:\s|$)/);
  return match ? match[0].trim() : trimmed;
}

function isConsentCategory(category: string): category is ConsentCategory {
  return ALL_CATEGORIES.includes(category as ConsentCategory);
}

function pointForCategory(category: ConsentCategory): string {
  switch (category) {
    case "Background Verification":
      return "The company may verify statements or information you provided.";
    case "Data Sharing":
      return "Your personal information may be shared with outside parties.";
    case "Liability Waiver":
      return "You may be releasing another party from certain liability.";
    case "Legal Rights":
      return "You may be agreeing to limits on dispute handling.";
    case "Employment Terms":
      return "You may be acknowledging employment terms if hired.";
    case "Financial Commitment":
      return "You may be agreeing to renewal, payment, refund, or cancellation terms.";
    case "Privacy Tracking":
      return "Your activity or device information may be used for analytics or advertising.";
    case "General Consent":
      return "You may be confirming agreement to terms or policies.";
  }
}
