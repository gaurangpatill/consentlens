import type { PatternRule } from "../content/types";

export const CONSENT_PATTERNS: PatternRule[] = [
  {
    category: "Background Verification",
    severity: "high",
    phrases: [
      "I authorize the Company to verify",
      "verify all statements made by me",
      "statements made by me",
      "former employers",
      "educational institutions",
      "background check",
      "consumer report",
      "outside parties"
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
      "without liability",
      "indemnify",
      "indemnification",
      "limitation of liability",
      "limit our liability"
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
      "class action",
      "waive my right",
      "jury trial",
      "arbitration agreement",
      "waive all claims",
      "governing law",
      "jurisdiction"
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
      "automatic renewal",
      "recurring charge",
      "recurring billing",
      "recurring fee",
      "free trial",
      "cancellation",
      "non-refundable",
      "cancellation fee",
      "early termination fee",
      "price increase",
      "rate change"
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
      "sell your personal information",
      "personal information",
      "personal data",
      "data broker",
      "service providers"
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
      "targeted advertising",
      "interest-based advertising",
      "analytics partners",
      "advertising partners",
      "location data",
      "precise location",
      "biometric",
      "voice recording",
      "audio recording"
    ],
    explanation:
      "Your browsing, location, or device activity may be tracked for analytics or advertising."
  },
  {
    category: "Content License",
    severity: "high",
    phrases: [
      "irrevocable license",
      "perpetual license",
      "royalty-free license",
      "worldwide license",
      "sublicense",
      "sublicensable",
      "user content",
      "user-generated content",
      "content you post",
      "content you submit",
      "reproduce and distribute",
      "display and distribute",
      "moral rights",
      "worldwide, royalty-free"
    ],
    explanation:
      "You may be granting the company a broad or permanent license to use content you create or post."
  },
  {
    category: "Account Control",
    severity: "medium",
    phrases: [
      "terminate your account",
      "suspend your account",
      "close your account",
      "terminate or suspend",
      "deactivate your account",
      "ban your account",
      "remove your content",
      "delete your content",
      "at our sole discretion",
      "in our sole discretion"
    ],
    explanation:
      "The company may restrict, suspend, or terminate your account at its discretion."
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
      "privacy policy",
      "by clicking",
      "by submitting",
      "by checking this box",
      "updates to these terms",
      "changes to this agreement"
    ],
    explanation:
      "You may be confirming agreement to terms, policies, or permissions on this page."
  }
];
