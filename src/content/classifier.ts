import { DETECTION_THRESHOLD, MAX_MATCHES } from "../shared/constants";
import { CONSENT_PATTERNS } from "../shared/patterns";
import { buildBullets, buildSummary, calculateScore, getRiskLevel, SCORE } from "../shared/scoring";
import type {
  ClassifierContext,
  ConsentAnalysis,
  ConsentClassifier,
  ConsentFinding,
  PatternRule,
  TextChunk
} from "./types";

export class RuleBasedConsentClassifier implements ConsentClassifier {
  analyze(chunks: TextChunk[], context: ClassifierContext): ConsentAnalysis {
    const matches = dedupeMatches(
      chunks.flatMap((chunk) => matchChunk(chunk, context.enabledCategories))
    ).slice(0, MAX_MATCHES);

    const totalScore = calculateScore(matches);
    const riskLevel = getRiskLevel(totalScore);
    const categories = Array.from(new Set(matches.map((match) => match.category)));
    const detected = totalScore >= DETECTION_THRESHOLD;
    const partialAnalysis = { riskLevel, categories };

    return {
      pageUrl: context.pageUrl,
      domain: context.domain,
      detected,
      riskLevel,
      totalScore,
      categories,
      summary: buildSummary(partialAnalysis),
      bullets: buildBullets(matches),
      matches
    };
  }
}

function matchChunk(chunk: TextChunk, enabledCategories: string[]): ConsentFinding[] {
  const findings: ConsentFinding[] = [];

  CONSENT_PATTERNS.filter((rule) => enabledCategories.includes(rule.category)).forEach((rule) => {
    rule.phrases.forEach((phrase) => {
      const index = chunk.text.toLowerCase().indexOf(phrase.toLowerCase());
      if (index === -1) return;

      findings.push({
        category: rule.category,
        severity: rule.severity,
        score: scoreRule(rule, chunk),
        phrase,
        explanation: rule.explanation,
        snippet: buildSnippet(chunk.text, index, phrase.length)
      });
    });
  });

  return findings;
}

function scoreRule(rule: PatternRule, chunk: TextChunk): number {
  const sourceBonus = chunk.source === "page" ? 0 : 1;
  return SCORE[rule.severity] + sourceBonus;
}

function dedupeMatches(matches: ConsentFinding[]): ConsentFinding[] {
  const seen = new Set<string>();
  const sorted = [...matches].sort((a, b) => b.score - a.score);
  const deduped: ConsentFinding[] = [];

  sorted.forEach((match) => {
    const key = `${match.category}:${normalizeComparable(match.phrase)}:${normalizeComparable(
      match.snippet
    ).slice(0, 120)}`;
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(match);
  });

  return deduped;
}

function buildSnippet(text: string, index: number, phraseLength: number): string {
  const start = Math.max(0, index - 90);
  const end = Math.min(text.length, index + phraseLength + 120);
  const prefix = start > 0 ? "... " : "";
  const suffix = end < text.length ? " ..." : "";
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

function normalizeComparable(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}
