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
  // Background verification
  {
    triggers: ["background check"],
    bullet: "You may be consenting to a background check on your personal history.",
    score: 20
  },
  {
    triggers: ["statements made by me"],
    bullet: "The company can verify information you provided and request supporting records.",
    score: 15
  },
  {
    triggers: ["former employers", "co-workers"],
    bullet: "The company may contact former employers, co-workers, or others listed as contacts.",
    score: 15
  },
  {
    triggers: ["without giving me prior notice"],
    bullet: "Information may be requested or released without giving you prior notice.",
    score: 15
  },
  {
    triggers: ["release from any liability", "liability or responsibility"],
    bullet: "You may be releasing the company and information providers from liability.",
    score: 20
  },
  {
    triggers: ["misrepresentation", "omission"],
    bullet: "Misstatements or omitted information may affect your eligibility or standing.",
    score: 10
  },
  {
    triggers: ["true and correct"],
    bullet: "You confirm that the information you provided is true, complete, and accurate.",
    score: 5
  },

  // Employment terms
  {
    triggers: ["at-will", "terminated at any time", "with or without cause", "with or without notice"],
    bullet: "Employment may be at-will and can end at any time, with or without reason.",
    score: 10
  },
  {
    triggers: ["strictest confidence", "policies and procedures", "safety rules"],
    bullet: "You agree to keep certain information confidential and follow applicable policies.",
    score: 5
  },

  // Financial / subscription
  {
    triggers: ["auto-renew", "automatically renew", "automatic renewal"],
    bullet: "Your subscription may automatically renew and you may be charged unless you cancel.",
    score: 22
  },
  {
    triggers: ["recurring charge", "recurring billing", "recurring fee"],
    bullet: "You may be agreeing to recurring charges to your payment method.",
    score: 22
  },
  {
    triggers: ["free trial"],
    bullet: "A free trial may be followed by automatic charges if you do not cancel.",
    score: 15
  },
  {
    triggers: ["non-refundable"],
    bullet: "Payments or fees may be non-refundable.",
    score: 15
  },
  {
    triggers: ["cancellation fee", "early termination fee", "termination fee"],
    bullet: "Canceling early may result in fees or penalties.",
    score: 15
  },
  {
    triggers: ["cancellation"],
    bullet: "Specific cancellation conditions or restrictions may apply.",
    score: 8
  },
  {
    triggers: ["price increase", "price change", "rate increase", "rate change"],
    bullet: "Prices or rates may change and you may be billed at the updated rate.",
    score: 12
  },

  // Legal rights
  {
    triggers: ["binding arbitration", "arbitration agreement"],
    bullet: "You may be agreeing to resolve all disputes through binding arbitration instead of court.",
    score: 44
  },
  {
    triggers: ["class action waiver", "class action"],
    bullet: "You may be waiving the right to participate in class action lawsuits.",
    score: 44
  },
  {
    triggers: ["jury trial"],
    bullet: "You may be waiving the right to a jury trial.",
    score: 25
  },
  {
    triggers: ["waive my right", "waive any claims", "waive all claims"],
    bullet: "You may be waiving certain legal rights or claims.",
    score: 22
  },
  {
    triggers: ["limitation of liability", "limit our liability"],
    bullet: "The company may limit how much you can recover if something goes wrong.",
    score: 20
  },
  {
    triggers: ["governing law", "venue for disputes"],
    bullet: "Disputes may only be handled in a specific jurisdiction or under a specific law.",
    score: 8
  },

  // Data sharing
  {
    triggers: ["sell your data", "sell your personal information", "sell your information"],
    bullet: "Your personal information may be sold to third parties.",
    score: 44
  },
  {
    triggers: ["data broker"],
    bullet: "Your information may be provided to data brokers or aggregators.",
    score: 25
  },
  {
    triggers: ["share your data", "share your personal information"],
    bullet: "Your personal information may be shared with outside parties.",
    score: 20
  },
  {
    triggers: ["third parties", "business partners", "affiliates", "service providers"],
    bullet: "Your information may be shared with third-party partners, affiliates, or service providers.",
    score: 15
  },
  {
    triggers: ["personal information", "personal data"],
    bullet: "Your personal information may be collected, used, or disclosed.",
    score: 10
  },

  // Privacy / tracking
  {
    triggers: ["behavioral advertising", "targeted advertising", "interest-based advertising"],
    bullet: "Your activity may be used for targeted or behavioral advertising.",
    score: 15
  },
  {
    triggers: ["analytics partners", "advertising partners"],
    bullet: "Your data may be shared with analytics or advertising partners.",
    score: 15
  },
  {
    triggers: ["tracking technologies", "cookies and similar technologies", "device identifiers"],
    bullet: "Cookies and tracking technologies may be used to monitor your activity.",
    score: 15
  },
  {
    triggers: ["location data", "precise location", "geolocation"],
    bullet: "Your location data may be collected and used.",
    score: 15
  },
  {
    triggers: ["biometric", "fingerprint", "facial recognition"],
    bullet: "Your biometric information may be collected or used.",
    score: 25
  },
  {
    triggers: ["voice recording", "audio recording", "record your voice"],
    bullet: "Your voice or audio may be recorded.",
    score: 20
  },

  // Liability waiver
  {
    triggers: ["hold harmless"],
    bullet: "You agree to hold the company harmless from claims arising from your actions.",
    score: 20
  },
  {
    triggers: ["not liable", "without liability"],
    bullet: "The company may not be held liable for certain outcomes or damages.",
    score: 15
  },
  {
    triggers: ["indemnify", "indemnification"],
    bullet: "You may be required to cover the company's legal costs arising from your use.",
    score: 20
  },
  {
    triggers: ["no warranty", "without warranty", "disclaimer of warranties"],
    bullet: "The service is provided without guarantees or warranties.",
    score: 10
  },

  // Content license
  {
    triggers: ["irrevocable license", "perpetual license", "royalty-free license"],
    bullet: "You grant the company a permanent, irrevocable, royalty-free license to use your content.",
    score: 25
  },
  {
    triggers: ["sublicense", "sublicensable"],
    bullet: "The company may sublicense your content to other parties.",
    score: 20
  },
  {
    triggers: ["content you post", "content you submit", "user content", "user-generated content"],
    bullet: "Content you post or submit may be used by the company.",
    score: 15
  },
  {
    triggers: ["reproduce and distribute", "worldwide license", "display and distribute", "worldwide, royalty-free"],
    bullet: "The company may reproduce, display, or distribute your content worldwide.",
    score: 20
  },
  {
    triggers: ["moral rights", "waive your moral rights"],
    bullet: "You may be waiving moral rights to your own content.",
    score: 20
  },

  // Account control
  {
    triggers: ["terminate your account", "suspend your account", "close your account", "terminate or suspend"],
    bullet: "The company may terminate or suspend your account at any time.",
    score: 20
  },
  {
    triggers: ["remove your content", "delete your content", "take down your content"],
    bullet: "The company may remove or delete your content at its discretion.",
    score: 15
  },
  {
    triggers: ["at our sole discretion", "in our sole discretion"],
    bullet: "The company may make decisions about your account or content at its sole discretion.",
    score: 10
  },
  {
    triggers: ["deactivate your account", "account deactivation", "ban your account"],
    bullet: "Your account may be deactivated or banned.",
    score: 15
  },

  // General consent signals
  {
    triggers: ["by clicking", "by submitting", "by checking this box", "by signing below"],
    bullet: "Clicking, submitting, or signing constitutes your agreement to the listed terms.",
    score: 5
  },
  {
    triggers: ["marketing", "promotional emails", "promotional communications", "marketing communications"],
    bullet: "You may receive marketing or promotional communications.",
    score: 5
  },
  {
    triggers: ["updates to these terms", "changes to this agreement", "modify these terms", "amended terms"],
    bullet: "Terms may change, and continued use may constitute acceptance of the new terms.",
    score: 8
  }
];

export function summarizeClauses(extractedText: string): ClauseSummary {
  const lower = extractedText.toLowerCase();
  const matchedTriggerPhrases: string[] = [];
  const bullets: string[] = [];
  let score = 0;

  for (const rule of CLAUSE_RULES) {
    const matched = rule.triggers.filter((trigger) => lower.includes(trigger));
    if (!matched.length) continue;

    matchedTriggerPhrases.push(...matched);
    score += rule.score;
    bullets.push(rule.bullet);
  }

  if (
    lower.includes("binding arbitration") ||
    lower.includes("class action") ||
    lower.includes("sell your data")
  ) {
    score = Math.max(score, 60);
  }

  if (
    lower.includes("auto-renew") ||
    lower.includes("automatically renew") ||
    lower.includes("recurring charge") ||
    lower.includes("without giving me prior notice") ||
    lower.includes("release from any liability") ||
    lower.includes("irrevocable license") ||
    lower.includes("perpetual license")
  ) {
    score = Math.max(score, 40);
  }

  const uniqueBullets = Array.from(new Set(bullets));

  return {
    bullets: uniqueBullets.slice(0, 7),
    matchedTriggerPhrases: Array.from(new Set(matchedTriggerPhrases)),
    score: normalizeScore(score, lower),
    fallbackBulletsUsed: false,
    summaryLine: buildClauseSummaryLine(lower, uniqueBullets)
  };
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
    lower.includes("statements made by me") &&
    lower.includes("former employers") &&
    (lower.includes("without giving me prior notice") || lower.includes("release from any liability"))
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

  if (
    lower.includes("irrevocable license") ||
    lower.includes("perpetual license") ||
    lower.includes("worldwide license")
  ) {
    return "You may be granting the company a permanent license to use content you post or create.";
  }

  if (lower.includes("terminate your account") || lower.includes("suspend your account")) {
    return "The company reserves the right to terminate or restrict your account at any time.";
  }

  if (lower.includes("jury trial") || lower.includes("waive any claims")) {
    return "You may be waiving certain legal rights including the right to a jury trial or to bring claims.";
  }

  if (lower.includes("indemnify") || lower.includes("hold harmless")) {
    return "You may be agreeing to protect the company from legal claims arising from your use.";
  }

  if (bullets.length) {
    return "You may be agreeing to specific permissions or obligations in this consent text.";
  }

  return "ConsentLens found agreement language, but could not confidently summarize specific clauses.";
}
