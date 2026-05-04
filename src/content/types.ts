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
  score: number;
  totalScore: number;
  categories: ConsentCategory[];
  summaryLine: string;
  summary: string;
  youMayBeAgreeingTo: string[];
  importantPoints: string[];
  bullets: string[];
  sourceSnippets: string[];
  sourceText: string;
  confidence: number;
  matches: ConsentFinding[];
};

export type LlmConsentResponse = {
  score: number;
  riskLevel: RiskLevel;
  summaryLine: string;
  youMayBeAgreeingTo: string[];
  importantPoints: string[];
  categories: string[];
  sourceSnippets: string[];
  confidence: number;
};

export type TextChunk = {
  id: string;
  text: string;
  source: "form" | "button-adjacent" | "dialog" | "page";
  priority: number;
};

export type ConsentBlock = {
  id: string;
  text: string;
  source: TextChunk["source"] | "checkbox-adjacent";
  priority: number;
  markerCount: number;
  markers: string[];
  pageUrl: string;
  domain: string;
  enabledCategories: ConsentCategory[];
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

export interface ConsentAnalyzer {
  analyze(input: ConsentBlock): Promise<ConsentAnalysis>;
}

export type ConsentMessage =
  | { type: "CONSENTLENS_GET_ANALYSIS" }
  | { type: "CONSENTLENS_RESCAN" }
  | { type: "CONSENTLENS_DISMISS" }
  | { type: "CONSENTLENS_IGNORE_SITE" };
