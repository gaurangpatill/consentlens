import type { PatternRule } from "../content/types";

export const CONSENT_PATTERNS: PatternRule[] = [
  {
    category: "Background Verification",
    severity: "high",
    phrases: [
      "I authorize the Company to verify",
      "verify all statements made by me",
      "former employers",
      "educational institutions",
      "background check"
    ],
    explanation:
      "You may be authorizing the company to contact employers, schools, or references to verify your information."
  },
  {
    category: "Liability Waiver",
    severity: "high",
    phrases: [
      "release from any liability",
      "hold harmless",
      "waive any claims",
      "not liable",
      "without liability"
    ],
    explanation:
      "You may be giving up the ability to hold another party responsible for certain outcomes."
  },
  {
    category: "Legal Rights",
    severity: "high",
    phrases: [
      "binding arbitration",
      "class action waiver",
      "waive my right",
      "jury trial",
      "arbitration agreement"
    ],
    explanation: "You may be agreeing to limits on how disputes can be handled."
  },
  {
    category: "Employment Terms",
    severity: "medium",
    phrases: [
      "at-will",
      "terminated at any time",
      "with or without cause",
      "with or without notice"
    ],
    explanation:
      "You may be acknowledging that employment can end at any time, with or without notice."
  },
  {
    category: "Financial Commitment",
    severity: "high",
    phrases: [
      "auto-renew",
      "automatically renew",
      "recurring charge",
      "free trial",
      "cancellation",
      "non-refundable"
    ],
    explanation:
      "You may be agreeing to a recurring payment or cancellation condition."
  },
  {
    category: "Data Sharing",
    severity: "medium",
    phrases: [
      "share your information",
      "third parties",
      "business partners",
      "affiliates",
      "sell your data",
      "personal information"
    ],
    explanation: "Your personal information may be shared with outside parties."
  },
  {
    category: "Privacy Tracking",
    severity: "medium",
    phrases: [
      "tracking technologies",
      "cookies and similar technologies",
      "device identifiers",
      "behavioral advertising",
      "analytics partners"
    ],
    explanation:
      "Your browsing or device activity may be tracked for analytics or advertising."
  },
  {
    category: "General Consent",
    severity: "low",
    phrases: [
      "I authorize",
      "I consent",
      "I agree",
      "I acknowledge",
      "terms and conditions",
      "privacy policy"
    ],
    explanation:
      "You may be confirming agreement to terms, policies, or permissions on this page."
  }
];
