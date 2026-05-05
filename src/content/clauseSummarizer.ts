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
  // Job application / background verification
  {
    triggers: ["verify", "statements made by me"],
    bullet: "The company may verify statements made in your application.",
    score: 20
  },
  {
    triggers: ["former employers", "co-workers"],
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
  },
  // Background check
  {
    triggers: ["background check"],
    bullet: "You may be consenting to a background check on your personal history.",
    score: 20
  },
  // Financial / subscription
  {
    triggers: ["auto-renew", "automatically renew", "automatic renewal"],
    bullet:
      "Your subscription may automatically renew and you may be charged unless you cancel in time.",
    score: 20
  },
  {
    triggers: ["recurring charge", "recurring billing", "recurring fee"],
    bullet: "You may be agreeing to recurring charges to your payment method.",
    score: 20
  },
  {
    triggers: ["free trial"],
    bullet:
      "A free trial period may be followed by automatic paid charges if you do not cancel.",
    score: 15
  },
  {
    triggers: ["non-refundable"],
    bullet: "Payments or fees may be non-refundable.",
    score: 15
  },
  {
    triggers: ["cancellation"],
    bullet: "Specific cancellation conditions or penalties may apply.",
    score: 10
  },
  // Legal rights
  {
    triggers: ["binding arbitration", "arbitration agreement"],
    bullet:
      "You may be agreeing to resolve disputes through binding arbitration instead of court.",
    score: 25
  },
  {
    triggers: ["class action waiver", "class action"],
    bullet: "You may be waiving the right to participate in class action lawsuits.",
    score: 25
  },
  {
    triggers: ["jury trial", "waive my right", "waive any claims"],
    bullet:
      "You may be waiving certain legal rights, including the right to a jury trial.",
    score: 25
  },
  // Data sharing
  {
    triggers: ["sell your data"],
    bullet: "Your personal information may be sold to third parties.",
    score: 25
  },
  {
    triggers: ["third parties", "business partners", "affiliates"],
    bullet:
      "Your personal information may be shared with third-party partners or affiliates.",
    score: 15
  },
  {
    triggers: ["personal information"],
    bullet: "Your personal information may be collected, used, or shared.",
    score: 10
  },
  // Privacy / tracking
  {
    triggers: ["behavioral advertising", "analytics partners"],
    bullet:
      "Your activity may be used for targeted advertising or shared with analytics partners.",
    score: 15
  },
  {
    triggers: ["tracking technologies", "cookies and similar technologies", "device identifiers"],
    bullet:
      "Cookies and tracking technologies may be used to monitor your browsing and device activity.",
    score: 15
  },
  // Liability waiver
  {
    triggers: ["hold harmless", "not liable", "without liability"],
    bullet: "The company may not be held liable for certain outcomes or damages.",
    score: 20
  },
  // General consent signals
  {
    triggers: ["by clicking", "by submitting", "by checking this box"],
    bullet:
      "Clicking or submitting this form constitutes your agreement to the listed terms.",
    score: 5
  },
  {
    triggers: ["marketing", "promotional emails", "promotional communications"],
    bullet: "You may receive marketing or promotional communications.",
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

  if (
    lower.includes("binding arbitration") ||
    lower.includes("class action waiver") ||
    lower.includes("sell your data") ||
    lower.includes("auto-renew") ||
    lower.includes("automatically renew") ||
    lower.includes("without giving me prior notice") ||
    lower.includes("release from any liability")
  ) {
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

  // Job application / background verification
  const hasVerification =
    lower.includes("verify") && lower.includes("statements made by me");
  const hasOutsideContacts =
    lower.includes("former employers") || lower.includes("co-workers");

  if (hasVerification && hasOutsideContacts) {
    bullets.push(
      "The company can verify information you provided and contact former employers, co-workers, or others listed as contacts."
    );
  } else if (hasVerification) {
    bullets.push(
      "The company can verify information you provided and request supporting records."
    );
  } else if (hasOutsideContacts) {
    bullets.push(
      "The company may contact former employers, co-workers, or others listed as contacts."
    );
  }

  if (lower.includes("background check")) {
    bullets.push("You may be consenting to a background check on your personal history.");
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

  const hasConfidentiality =
    lower.includes("strictest confidence") || lower.includes("confidential");
  const hasPolicies =
    lower.includes("policies and procedures") ||
    lower.includes("safety rules") ||
    lower.includes("security investigation");

  if (hasConfidentiality || hasPolicies) {
    bullets.push(
      "You agree to keep certain information confidential and follow the company's policies, safety rules, or security requirements."
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
      "Employment may be at-will, and misrepresentations or omissions may affect eligibility or standing."
    );
  }

  if (lower.includes("true and correct") && bullets.length < 4) {
    bullets.push("You confirm that the information you provided is true, complete, and correct.");
  }

  // Financial / subscription
  if (
    lower.includes("auto-renew") ||
    lower.includes("automatically renew") ||
    lower.includes("automatic renewal")
  ) {
    bullets.push(
      "Your subscription may automatically renew and you may be charged unless you cancel in time."
    );
  }

  if (
    lower.includes("recurring charge") ||
    lower.includes("recurring billing") ||
    lower.includes("recurring fee")
  ) {
    bullets.push("You may be agreeing to recurring charges to your payment method.");
  }

  if (lower.includes("free trial")) {
    bullets.push(
      "A free trial period may be followed by automatic paid charges if you do not cancel."
    );
  }

  if (lower.includes("non-refundable")) {
    bullets.push("Payments or fees may be non-refundable.");
  }

  if (
    lower.includes("cancellation") &&
    !lower.includes("auto-renew") &&
    !lower.includes("automatically renew") &&
    !lower.includes("recurring")
  ) {
    bullets.push("Specific cancellation conditions or penalties may apply.");
  }

  // Legal rights
  if (lower.includes("binding arbitration") || lower.includes("arbitration agreement")) {
    bullets.push(
      "You may be agreeing to resolve disputes through binding arbitration instead of court."
    );
  }

  if (lower.includes("class action waiver") || lower.includes("class action")) {
    bullets.push("You may be waiving the right to participate in class action lawsuits.");
  }

  if (
    lower.includes("jury trial") ||
    lower.includes("waive my right") ||
    lower.includes("waive any claims")
  ) {
    bullets.push(
      "You may be waiving certain legal rights, including the right to a jury trial."
    );
  }

  // Data sharing
  if (lower.includes("sell your data")) {
    bullets.push("Your personal information may be sold to third parties.");
  } else if (
    lower.includes("third parties") ||
    lower.includes("business partners") ||
    lower.includes("affiliates")
  ) {
    bullets.push(
      "Your personal information may be shared with third-party partners or affiliates."
    );
  }

  // Privacy / tracking
  if (lower.includes("behavioral advertising") || lower.includes("analytics partners")) {
    bullets.push(
      "Your activity may be used for targeted advertising or shared with analytics partners."
    );
  } else if (
    lower.includes("tracking technologies") ||
    lower.includes("cookies and similar technologies") ||
    lower.includes("device identifiers")
  ) {
    bullets.push(
      "Cookies and tracking technologies may be used to monitor your browsing and device activity."
    );
  }

  // Liability waiver
  if (
    lower.includes("hold harmless") ||
    lower.includes("not liable") ||
    lower.includes("without liability")
  ) {
    if (!bullets.some((b) => b.includes("releasing the company"))) {
      bullets.push("The company may not be held liable for certain outcomes or damages.");
    }
  }

  return bullets;
}

export function buildFallbackClauseBullets(extractedText: string): string[] {
  if (extractedText.trim().length >= 100) return [];
  return [
    "ConsentLens found agreement language, but the extracted text was too short to summarize safely."
  ];
}

function normalizeScore(score: number, lower: string): number {
  const capped = Math.min(100, Math.max(1, score));
  const isJobApplicationBlock =
    lower.includes("former employers") &&
    (lower.includes("at-will") || lower.includes("terminated at any time"));

  return isJobApplicationBlock ? Math.min(capped, 85) : capped;
}

function buildClauseSummaryLine(lower: string, bullets: string[]): string {
  if (
    lower.includes("verify") &&
    lower.includes("former employers") &&
    (lower.includes("without giving me prior notice") ||
      lower.includes("release from any liability"))
  ) {
    return "You are granting broad permission to verify your background, contact outside parties, and act on information you provided.";
  }

  if (lower.includes("binding arbitration") || lower.includes("class action waiver")) {
    return "You may be giving up important legal rights, including the right to sue or participate in class actions.";
  }

  if (
    lower.includes("auto-renew") ||
    lower.includes("automatically renew") ||
    lower.includes("recurring charge")
  ) {
    return "You may be agreeing to a subscription that automatically renews and charges your payment method.";
  }

  if (
    lower.includes("sell your data") ||
    (lower.includes("third parties") && lower.includes("personal information"))
  ) {
    return "You may be agreeing that your personal information can be shared with or sold to third parties.";
  }

  if (lower.includes("jury trial") || lower.includes("waive any claims")) {
    return "You may be waiving certain legal rights including the right to a jury trial or to bring claims.";
  }

  if (bullets.length) {
    return "You may be agreeing to specific permissions or obligations in this consent text.";
  }

  return "ConsentLens found agreement language, but could not confidently summarize specific clauses.";
}
