/**
 * Deterministic explainable matching — blueprint §3.4 / ADR-006.
 *
 * score(job, candidate) = Σ weighted requirement results:
 *   required skill  w=3   MET if skill evidence exists
 *   optional skill  w=1   MET / PARTIAL
 *   credential gate w=—   HARD FILTER (candidate must hold a credential in X)
 *   location        w=1   MET if within radius or REMOTE
 *   experience      w=1   MET if months since credential issue ≥ required
 *
 * The result (requirement set + evidence refs) is STORED so the employer UI
 * renders "why this candidate" without recompute. AI may only narrate this
 * table — it can never add/remove requirements or reorder beyond score.
 */

export type RequirementResult = "MET" | "PARTIAL" | "MISSING";

export interface EvidenceRef {
  type: "COURSE" | "ASSESSMENT" | "CREDENTIAL";
  label: string;
  ref: string;
}

export interface MatchRequirement {
  requirement: string;
  kind: "REQUIRED" | "OPTIONAL" | "GATE" | "LOCATION" | "EXPERIENCE";
  result: RequirementResult | "PASS" | "FAIL";
  weight: number;
  evidence: EvidenceRef[];
}

export interface MatchResult {
  total_score: number; // 0–100 normalized
  requirements: MatchRequirement[];
}

export interface CandidateSkill {
  skill_code: string;
  evidence: EvidenceRef[];
}

export interface Candidate {
  skills: CandidateSkill[];
  /** programme ids the candidate holds a credential for */
  credential_programme_ids: string[];
  location: string | null;
  remote_ok: boolean;
  /** months since earliest credential issue (MVP proxy) */
  experience_months: number;
}

export interface JobRequirement {
  skill_code: string;
  skill_name: string;
  kind: "REQUIRED" | "OPTIONAL";
}

export interface JobSpec {
  requirements: JobRequirement[];
  /** hard filter: candidate must hold a credential in this programme */
  credential_gate_programme_id: string | null;
  location: string;
  remote: boolean;
  experience_min_months: number;
}

const W_REQUIRED = 3;
const W_OPTIONAL = 1;
const W_LOCATION = 1;
const W_EXPERIENCE = 1;

export function scoreMatch(job: JobSpec, candidate: Candidate): MatchResult {
  const requirements: MatchRequirement[] = [];

  // Hard filter first — a failed gate yields score 0 with everything MISSING.
  const gatePass =
    !job.credential_gate_programme_id ||
    candidate.credential_programme_ids.includes(job.credential_gate_programme_id);

  if (job.credential_gate_programme_id) {
    requirements.push({
      requirement: `Credential in programme ${job.credential_gate_programme_id}`,
      kind: "GATE",
      result: gatePass ? "PASS" : "FAIL",
      weight: 0,
      evidence: gatePass
        ? [{ type: "CREDENTIAL", label: "Programme credential", ref: job.credential_gate_programme_id }]
        : [],
    });
  }

  let earned = 0;
  let possible = 0;

  for (const req of job.requirements) {
    const cand = candidate.skills.find((s) => s.skill_code === req.skill_code);
    const weight = req.kind === "REQUIRED" ? W_REQUIRED : W_OPTIONAL;
    possible += weight;

    let result: RequirementResult;
    if (cand && cand.evidence.length > 0) {
      result = "MET";
      earned += weight;
    } else if (cand) {
      result = "PARTIAL";
      earned += weight * 0.5;
    } else {
      result = "MISSING";
    }

    requirements.push({
      requirement: `${req.kind === "REQUIRED" ? "Required" : "Optional"}: ${req.skill_name}`,
      kind: req.kind,
      result,
      weight,
      evidence: cand?.evidence ?? [],
    });
  }

  // Location: REMOTE job or candidate willing to work remotely → MET.
  const locationPass = job.remote || candidate.remote_ok || job.location === candidate.location;
  possible += W_LOCATION;
  if (locationPass) earned += W_LOCATION;
  requirements.push({
    requirement: `Location: ${job.location}${job.remote ? " (remote ok)" : ""}`,
    kind: "LOCATION",
    result: locationPass ? "MET" : "MISSING",
    weight: W_LOCATION,
    evidence: [],
  });

  const experiencePass = candidate.experience_months >= job.experience_min_months;
  possible += W_EXPERIENCE;
  if (experiencePass) earned += W_EXPERIENCE;
  requirements.push({
    requirement: `Experience: ≥${job.experience_min_months} months`,
    kind: "EXPERIENCE",
    result: experiencePass ? "MET" : "MISSING",
    weight: W_EXPERIENCE,
    evidence: [],
  });

  const gateFactor = gatePass ? 1 : 0;
  const total = possible > 0 ? Math.round((earned / possible) * 100 * gateFactor) : 0;

  return { total_score: total, requirements };
}
