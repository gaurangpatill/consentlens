export type ClauseSummary = {
  bullets: string[];
  matchedTriggerPhrases: string[];
  score: number;
  fallbackBulletsUsed: boolean;
  summaryLine: string;
};

type ClauseRule = {
  triggers: string[];
  bullet: string;
  score: number;
};

const CLAUSE_RULES: ClauseRule[] = [
  {
    triggers: ["verify", "statements made by me"],
    bullet: "The company may verify statements made in your application.",
    score: 20
  },
  {
    triggers: ["former employers", "co-workers", "schools", "references"],
    bullet: "The company may contact former employers, co-workers, schools, references, or others.",
    score: 15
  },
  {
    triggers: ["without giving me prior notice"],
    bullet: "Information may be requested or released without giving you prior notice.",
    score: 15
  },
  {
    triggers: ["release from any liability", "liability or responsibility"],
    bullet:
      "You may be releasing the company and information providers from liability related to verification.",
    score: 20
  },
  {
    triggers: ["strictest confidence", "confidential"],
    bullet: "You agree to keep company or customer information confidential.",
    score: 5
  },
  {
    triggers: ["at-will", "terminated at any time"],
    bullet: "If hired, your employment may be at-will and can end at any time.",
    score: 10
  },
  {
    triggers: ["misrepresentation", "omission"],
    bullet: "Misstatements or omitted information may lead to rejection or termination.",
    score: 10
  },
  {
    triggers: ["true and correct"],
    bullet: "You confirm that your application materials are true and complete.",
    score: 5
  }
];

export function summarizeClauses(extractedText: string): ClauseSummary {
  const lower = extractedText.toLowerCase();
  const matchedTriggerPhrases: string[] = [];
  let score = 0;

  CLAUSE_RULES.forEach((rule) => {
    const matched = rule.triggers.filter((trigger) => lower.includes(trigger));
    if (!matched.length) return;

    matchedTriggerPhrases.push(...matched);
    score += rule.score;
  });

  const bullets = buildGroupedBullets(lower);

  if (lower.includes("without giving me prior notice") || lower.includes("release from any liability")) {
    score = Math.max(score, 60);
  }

  return {
    bullets: Array.from(new Set(bullets)).slice(0, 7),
    matchedTriggerPhrases: Array.from(new Set(matchedTriggerPhrases)),
    score: normalizeScore(score, lower),
    fallbackBulletsUsed: false,
    summaryLine: buildClauseSummaryLine(lower, bullets)
  };
}

function buildGroupedBullets(lower: string): string[] {
  const bullets: string[] = [];

  const hasVerification =
    lower.includes("verify") &&
    (lower.includes("statements made by me") || lower.includes("statements"));
  const hasOutsideContacts =
    lower.includes("former employers") ||
    lower.includes("co-workers") ||
    lower.includes("schools") ||
    lower.includes("references");

  if (hasVerification && hasOutsideContacts) {
    bullets.push(
      "The company can verify your application statements and contact former employers, co-workers, schools, references, or others."
    );
  } else if (hasVerification) {
    bullets.push(
      "The company can verify your application statements and request supporting records such as transcripts or evaluations."
    );
  } else if (hasOutsideContacts) {
    bullets.push(
      "The company may contact former employers, co-workers, schools, references, or others about your employment or education."
    );
  }

  if (
    lower.includes("without giving me prior notice") ||
    lower.includes("release from any liability") ||
    lower.includes("liability or responsibility")
  ) {
    bullets.push(
      "Those parties may release information without prior notice, and you may be releasing the company and information providers from verification-related liability."
    );
  }

  const hasConfidentiality = lower.includes("strictest confidence") || lower.includes("confidential");
  const hasPolicies =
    lower.includes("policies and procedures") ||
    lower.includes("safety rules") ||
    lower.includes("security investigation");

  if (hasConfidentiality || hasPolicies) {
    bullets.push(
      "You agree to keep company or customer information confidential and follow company policies, safety rules, or security checks if hired."
    );
  }

  if (
    lower.includes("at-will") ||
    lower.includes("terminated at any time") ||
    lower.includes("with or without cause") ||
    lower.includes("with or without notice") ||
    lower.includes("misrepresentation") ||
    lower.includes("omission")
  ) {
    bullets.push(
      "If hired, employment may be at-will, and misrepresentations or omissions may lead to rejection or termination."
    );
  }

  if (lower.includes("true and correct") && bullets.length < 4) {
    bullets.push("You confirm that your application materials are true, complete, and correct.");
  }

  return bullets;
}

export function buildFallbackClauseBullets(extractedText: string): string[] {
  if (extractedText.trim().length >= 100) return [];
  return ["ConsentLens found agreement language, but the extracted text was too short to summarize safely."];
}

function normalizeScore(score: number, lower: string): number {
  const capped = Math.min(100, Math.max(1, score));
  const isJobApplicationBlock =
    lower.includes("employment") &&
    (lower.includes("former employers") || lower.includes("references")) &&
    (lower.includes("at-will") || lower.includes("terminated at any time"));

  return isJobApplicationBlock ? Math.min(capped, 85) : capped;
}

function buildClauseSummaryLine(lower: string, bullets: string[]): string {
  if (
    lower.includes("verify") &&
    (lower.includes("former employers") || lower.includes("references")) &&
    (lower.includes("without giving me prior notice") || lower.includes("release from any liability"))
  ) {
    return "You are granting the company broad permission to verify your background, contact outside parties, and rely on your application statements.";
  }

  if (bullets.length) {
    return "You may be agreeing to specific permissions or obligations in this consent text.";
  }

  return "ConsentLens found agreement language, but could not confidently summarize specific clauses.";
}
