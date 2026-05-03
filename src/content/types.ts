export type RiskLevel = "low" | "medium" | "high";

export type ConsentCategory =
  | "Background Verification"
  | "Data Sharing"
  | "Liability Waiver"
  | "Legal Rights"
  | "Employment Terms"
  | "Financial Commitment"
  | "Privacy Tracking"
  | "General Consent";

export type ConsentFinding = {
  category: ConsentCategory;
  severity: RiskLevel;
  score: number;
  phrase: string;
  explanation: string;
  snippet: string;
};

export type ConsentAnalysis = {
  pageUrl: string;
  domain: string;
  detected: boolean;
  riskLevel: RiskLevel;
  totalScore: number;
  categories: ConsentCategory[];
  summary: string;
  bullets: string[];
  matches: ConsentFinding[];
};

export type TextChunk = {
  id: string;
  text: string;
  source: "form" | "button-adjacent" | "dialog" | "page";
  priority: number;
};

export type PatternRule = {
  category: ConsentCategory;
  severity: RiskLevel;
  phrases: string[];
  explanation: string;
};

export type ClassifierContext = {
  pageUrl: string;
  domain: string;
  enabledCategories: ConsentCategory[];
};

export interface ConsentClassifier {
  analyze(chunks: TextChunk[], context: ClassifierContext): ConsentAnalysis;
}

export type ConsentMessage =
  | { type: "CONSENTLENS_GET_ANALYSIS" }
  | { type: "CONSENTLENS_RESCAN" }
  | { type: "CONSENTLENS_DISMISS" }
  | { type: "CONSENTLENS_IGNORE_SITE" };
