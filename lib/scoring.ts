import type { RfqBody } from "./db";

// Pure scoring logic: the LLM judges each requirement, this file turns those
// judgements into a score, reasons and gaps. No I/O here.

export const CATEGORIES = ["mandatory", "required", "technical", "preferred"] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATUSES = ["met", "partial", "not_met"] as const;
export type Status = (typeof STATUSES)[number];

// Points each category contributes to the 100. Mandatory items earn no points;
// they are a gate (see MANDATORY_FAIL_FACTOR).
const CATEGORY_POINTS: Record<Exclude<Category, "mandatory">, number> = {
  required: 40,
  technical: 40,
  preferred: 20,
};

const CREDIT: Record<Status, number> = { met: 1, partial: 0.5, not_met: 0 };

// If any mandatory item is not fully met, the score is multiplied by this.
// Keeps such vendors at 40 or below while still ranking them against each other.
const MANDATORY_FAIL_FACTOR = 0.4;

const ID_PREFIX: Record<Category, string> = {
  mandatory: "M",
  required: "R",
  technical: "T",
  preferred: "P",
};

export type Requirement = { id: string; category: Category; text: string };

export type Assessment = Requirement & {
  status: Status; // after the evidence check
  llmStatus: Status; // what the LLM said
  evidence: string;
  evidenceFound: boolean;
  comment: string;
};

// Flattens an RFQ into a list of requirements with stable ids (M1, R1, T1, P1...).
export function buildRequirements(rfq: RfqBody): Requirement[] {
  const lists: Record<Category, string[]> = {
    mandatory: rfq.mandatory,
    required: rfq.required,
    technical: [...rfq.technical, `Delivery: ${rfq.delivery}`],
    preferred: rfq.preferred,
  };
  return CATEGORIES.flatMap((category) =>
    lists[category].map((text, i) => ({
      id: `${ID_PREFIX[category]}${i + 1}`,
      category,
      text,
    })),
  );
}

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// A met/partial verdict must be backed by a quote that really appears in the
// profile. If it doesn't, the verdict drops one level.
export function checkEvidence(
  requirement: Requirement,
  llm: { status: Status; evidence: string; comment: string },
  profile: string,
): Assessment {
  const quote = normalize(llm.evidence);
  const evidenceFound = quote.length > 0 && normalize(profile).includes(quote);

  let status = llm.status;
  if (!evidenceFound && status === "met") status = "partial";
  else if (!evidenceFound && status === "partial") status = "not_met";

  return {
    ...requirement,
    status,
    llmStatus: llm.status,
    evidence: llm.evidence,
    evidenceFound,
    comment: llm.comment,
  };
}

export type CategorySummary = {
  category: Category;
  met: number;
  partial: number;
  total: number;
};

export function summarize(assessments: Assessment[]): CategorySummary[] {
  return CATEGORIES.map((category) => {
    const items = assessments.filter((a) => a.category === category);
    return {
      category,
      met: items.filter((a) => a.status === "met").length,
      partial: items.filter((a) => a.status === "partial").length,
      total: items.length,
    };
  }).filter((s) => s.total > 0);
}

export function computeScore(assessments: Assessment[]): number {
  let earned = 0;
  let possible = 0;
  for (const [category, points] of Object.entries(CATEGORY_POINTS)) {
    const items = assessments.filter((a) => a.category === category);
    if (items.length === 0) continue; // its points are left out of the total
    const credit = items.reduce((sum, a) => sum + CREDIT[a.status], 0) / items.length;
    earned += points * credit;
    possible += points;
  }

  let score = possible === 0 ? 0 : (earned / possible) * 100;
  const mandatoryFailed = assessments.some(
    (a) => a.category === "mandatory" && a.status !== "met",
  );
  if (mandatoryFailed) score *= MANDATORY_FAIL_FACTOR;
  return Math.round(score);
}

const byCategory = (a: Assessment, b: Assessment) =>
  CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category);

const describe = (a: Assessment) => `${a.text}: ${a.comment}`;

// Reasons: met items first, then partial, most important category first.
// Gaps: not-met items first, then partial, most important category first.
export function pickReasonsAndGaps(assessments: Assessment[]) {
  const met = assessments.filter((a) => a.status === "met").sort(byCategory);
  const partial = assessments.filter((a) => a.status === "partial").sort(byCategory);
  const notMet = assessments.filter((a) => a.status === "not_met").sort(byCategory);

  const reasons = [...met, ...partial].slice(0, 3).map(describe);
  while (reasons.length < 3) {
    reasons.push("Nothing else in the profile meets this RFQ's requirements.");
  }

  const gaps = [...notMet, ...partial]
    .filter((a) => !reasons.includes(describe(a)))
    .slice(0, 2)
    .map(describe);
  while (gaps.length < 2) {
    gaps.push("No further gaps found against this RFQ's requirements.");
  }

  return { reasons, gaps };
}
