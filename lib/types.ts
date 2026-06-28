export const riskCategories = [
  "prompt-injection",
  "hallucination",
  "missing-source-grounding",
  "sensitive-disclosure",
  "excessive-agency",
  "overconfident-wrong-answer"
] as const;

export type RiskCategory = (typeof riskCategories)[number];

export const severityLevels = ["low", "medium", "high", "critical"] as const;

export type Severity = (typeof severityLevels)[number];

export type RunStatus = "pass" | "fail";

export type TestCase = {
  id: string;
  name: string;
  userInput: string;
  untrustedContext: string;
  expectedBehavior: string;
  riskCategory: RiskCategory;
  severity: Severity;
  createdAt: string;
};

export type RunResult = {
  id: string;
  testCaseId: string;
  status: RunStatus;
  riskScore: number;
  explanation: string;
  suggestedFix: string;
  mockedResponse: string;
  createdAt: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  targetAssistant: string;
  createdAt: string;
  testCases: TestCase[];
  runs: RunResult[];
};

export type Workspace = {
  projects: Project[];
};

export type NewProjectInput = {
  name: string;
  description: string;
  targetAssistant: string;
};

export type NewTestCaseInput = {
  name: string;
  userInput: string;
  untrustedContext: string;
  expectedBehavior: string;
  riskCategory: RiskCategory;
  severity: Severity;
};

export const riskCategoryLabels: Record<RiskCategory, string> = {
  "prompt-injection": "Prompt injection",
  hallucination: "Hallucination",
  "missing-source-grounding": "Missing source grounding",
  "sensitive-disclosure": "Sensitive disclosure",
  "excessive-agency": "Excessive agency",
  "overconfident-wrong-answer": "Overconfident wrong answer"
};
