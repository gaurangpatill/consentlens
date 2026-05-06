import { CONSENT_PATTERNS } from "../shared/patterns";
import { buildBullets, clampRiskScore, getRiskLevel, SCORE } from "../shared/scoring";
import { buildFallbackClauseBullets, summarizeClauses } from "./clauseSummarizer";
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
};

const BLOCK_SIGNALS: CategorySignal[] = [
  ...CONSENT_PATTERNS,
  {
    category: "Background Verification",
    severity: "high",
    phrases: ["employment history", "education history"],
    explanation:
      "You may be authorizing verification of personal, employment, or education information."
  },
  {
    category: "Data Sharing",
    severity: "medium",
    phrases: ["consumer report", "outside parties"],
    explanation: "Information may be requested from or shared with outside parties."
  },
  {
    category: "Employment Terms",
    severity: "medium",
    phrases: ["if hired"],
    explanation: "You may be acknowledging employment terms connected to the agreement."
  },
  {
    category: "Content License",
    severity: "high",
    phrases: ["grant us a license", "license to use your", "license to host", "license to store"],
    explanation: "You may be granting the company a broad license to use content you post."
  },
  {
    category: "Account Control",
    severity: "medium",
    phrases: ["modify or terminate", "restrict access", "access may be revoked"],
    explanation: "The company may restrict or end your access to the service."
  }
];

export class RuleBasedConsentAnalyzer implements ConsentAnalyzer {
  async analyze(input: ConsentBlock): Promise<ConsentAnalysis> {
    const matches = dedupeMatches(findMatches(input));
    const categories = Array.from(new Set(matches.map((match) => match.category)));
    const clauseSummary = summarizeClauses(input.text);
    const fallbackBullets = buildFallbackClauseBullets(input.text);
    const matchBullets = matches.length ? buildBullets(matches) : [];
    const rawBullets = clauseSummary.bullets.length ? clauseSummary.bullets : fallbackBullets;
    const youMayBeAgreeingTo = rawBullets.length ? rawBullets : matchBullets;
    const fallbackBulletsUsed = clauseSummary.bullets.length === 0 && youMayBeAgreeingTo.length > 0;
    const score = clauseSummary.matchedTriggerPhrases.length
      ? clauseSummary.score
      : scoreBlock(input, matches, categories);
    const riskLevel = getRiskLevel(score);
    const sourceSnippets = buildSourceSnippets(input, matches, clauseSummary.matchedTriggerPhrases);
    const summaryLine = clauseSummary.matchedTriggerPhrases.length
      ? clauseSummary.summaryLine
      : buildSummaryLine(input, categories, matches);

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
      matches,
      debug: buildDebug(input, "local", clauseSummary.matchedTriggerPhrases, fallbackBulletsUsed)
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
      const clauseSummary = summarizeClauses(input.text);

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
        matches: [],
        debug: buildDebug(input, "llm", clauseSummary.matchedTriggerPhrases, false)
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
  const hasContentLicense = categories.includes("Content License");
  const hasAccountControl = categories.includes("Account Control");
  const highCount = [hasLegalRights, hasDataSharing, hasContentLicense, hasBackground, hasLiability].filter(Boolean).length;
  const text = input.text.toLowerCase();

  if (highCount >= 3) {
    return "This agreement covers multiple areas — including your data, rights, and legal options — worth reviewing carefully.";
  }

  if (hasLegalRights && hasDataSharing) {
    return "You may be giving up legal rights and agreeing to share your personal information.";
  }

  if (hasLegalRights && hasFinancial) {
    return "You may be agreeing to payment terms and giving up your right to dispute them in court.";
  }

  if (hasBackground && hasDataSharing) {
    return "You may be granting broad permission to verify your background and contact outside parties.";
  }

  if (hasBackground && hasLiability) {
    return "You may be authorizing verification while releasing some parties from verification-related liability.";
  }

  if (hasContentLicense && hasAccountControl) {
    return "The company may use content you post and can restrict or close your account at any time.";
  }

  if (hasLegalRights) {
    return "You may be agreeing to limits on how disputes can be handled, including waiving your right to sue.";
  }

  if (hasDataSharing && text.includes("sell")) {
    return "You may be agreeing that your personal information can be sold or shared with third parties.";
  }

  if (hasFinancial) {
    return "You may be agreeing to payment, renewal, refund, or cancellation terms.";
  }

  if (hasContentLicense) {
    return "You may be granting the company broad rights to use content you post or create.";
  }

  if (hasAccountControl) {
    return "The company reserves rights to restrict or close your account at its discretion.";
  }

  if (hasEmployment) {
    return "You may be acknowledging employment terms that could affect notice or termination.";
  }

  if (hasDataSharing) {
    return "You may be agreeing that personal information can be shared with outside parties.";
  }

  if (matches.length || /\b(i agree|i acknowledge|i understand|terms|privacy)\b/i.test(text)) {
    return "This appears to be meaningful consent language that may affect what you are agreeing to.";
  }

  return "ConsentLens found agreement language worth reviewing before you continue.";
}

function buildSourceSnippets(
  input: ConsentBlock,
  matches: ConsentFinding[],
  matchedTriggerPhrases: string[]
): string[] {
  const triggerSnippets = matchedTriggerPhrases
    .map((trigger) => {
      const index = input.text.toLowerCase().indexOf(trigger.toLowerCase());
      return index >= 0 ? buildSnippet(input.text, index, trigger.length) : "";
    })
    .filter(Boolean);
  const snippets = [...triggerSnippets, ...matches.map((match) => match.snippet)];

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

function normalizeComparable(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function buildDebug(
  input: ConsentBlock,
  analyzerUsed: "local" | "llm",
  matchedTriggerPhrases: string[],
  fallbackBulletsUsed: boolean
) {
  return {
    extractedTextLength: input.text.length,
    extractedTextPreview: input.text.slice(0, 500),
    matchedTriggerPhrases,
    sourceElement: input.sourceElement,
    analyzerUsed,
    fallbackBulletsUsed
  };
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
    youMayBeAgreeingTo.length < 1 ||
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
