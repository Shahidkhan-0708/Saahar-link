import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useAsync } from "./Login";

type Employer = { id: string; name: string; verified: boolean };
type Job = { id: string; title: string; location: string; employerId: string; employerName: string };
type Match = {
  candidate: { id: string; display_name: string; email: string };
  score: number;
  requirements: {
    requirement: string;
    kind: string;
    result: string;
    evidence: { type: string; label: string; ref: string }[];
  }[];
};
type Application = {
  id: string;
  jobId: string;
  state: string;
  traineeName: string;
  jobTitle: string;
};
type Outcome = { applicationId: string; milestone: string };

const TRANSITIONS: Record<string, string[]> = {
  APPLIED: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["SELECTED", "REJECTED"],
  SELECTED: ["JOINED", "REJECTED"],
  JOINED: ["REPORTED"],
};

export function Employer() {
  const employers = useAsync(() => api<{ employers: Employer[] }>("/v1/employers"));
  const jobs = useAsync(() => api<{ jobs: Job[] }>("/v1/jobs"));
  const applications = useAsync(() => api<{ applications: Application[] }>("/v1/applications"));
  const outcomes = useAsync(() => api<{ outcomes: Outcome[] }>("/v1/outcomes"));
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const myEmployer = (employers.data?.employers ?? [])[0];

  async function onboard(e: FormEvent) {
    e.preventDefault();
    const name = (e.target as HTMLFormElement).elements.namedItem("name") as HTMLInputElement;
    try {
      await api("/v1/employers", { method: "POST", json: { name: name.value } });
      setMsg("Employer profile created — awaiting verification");
      employers.reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "failed");
    }
  }

  async function postJob(e: FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem("title") as HTMLInputElement).value;
    const location = (form.elements.namedItem("location") as HTMLInputElement).value;
    const required = (form.elements.namedItem("required") as HTMLInputElement).value;
    const optional = (form.elements.namedItem("optional") as HTMLInputElement).value;
    try {
      await api("/v1/jobs", {
        method: "POST",
        json: {
          employer_id: myEmployer!.id,
          title,
          location,
          experience_min_months: 0,
          requirements: [
            ...required.split(",").map((s) => ({ skill_code: s.trim(), kind: "REQUIRED" as const })),
            ...optional.split(",").filter(Boolean).map((s) => ({ skill_code: s.trim(), kind: "OPTIONAL" as const })),
          ],
        },
      });
      setMsg("Job posted");
      form.reset();
      jobs.reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "failed");
    }
  }

  async function loadMatches(jobId: string) {
    setSelectedJob(jobId);
    try {
      const res = await api<{ matches: Match[] }>(`/v1/jobs/${jobId}/matches`);
      setMatches(res.matches);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "failed");
    }
  }

  async function transition(id: string, state: string) {
    try {
      await api(`/v1/applications/${id}/state`, { method: "PATCH", json: { state } });
      setMsg(`Application → ${state}`);
      applications.reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "failed");
    }
  }

  async function confirmOutcome(applicationId: string) {
    try {
      await api("/v1/outcomes/events", {
        method: "POST",
        json: { application_id: applicationId, milestone: "EMPLOYER_CONFIRMED" },
      });
      setMsg("Outcome confirmed (idempotent event)");
      outcomes.reload();
      applications.reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "failed");
    }
  }

  const confirmed = new Set(
    (outcomes.data?.outcomes ?? [])
      .filter((o) => o.milestone === "EMPLOYER_CONFIRMED")
      .map((o) => o.applicationId),
  );

  return (
    <section>
      <h1>Employer console</h1>
      {msg && <p className="muted">{msg}</p>}

      {!myEmployer ? (
        <form className="card inline-form" onSubmit={onboard}>
          <input name="name" placeholder="Organisation name" required minLength={2} />
          <button type="submit">Create employer profile</button>
        </form>
      ) : (
        <p>
          <span className={`chip ${myEmployer.verified ? "ok" : ""}`}>
            {myEmployer.verified ? "VERIFIED" : "PENDING VERIFICATION"}
          </span>{" "}
          {myEmployer.name}
        </p>
      )}

      {myEmployer && (
        <form className="card inline-form" onSubmit={postJob}>
          <input name="title" placeholder="Job title" required minLength={3} />
          <input name="location" placeholder="Location" required />
          <input name="required" placeholder="required skills (csv)" required />
          <input name="optional" placeholder="optional skills (csv)" />
          <button type="submit">Post job</button>
        </form>
      )}

      <h3>Jobs</h3>
      <table>
        <thead><tr><th>Title</th><th>Location</th><th>Employer</th><th></th></tr></thead>
        <tbody>
          {(jobs.data?.jobs ?? []).map((j) => (
            <tr key={j.id}>
              <td>{j.title}</td>
              <td>{j.location}</td>
              <td>{j.employerName}</td>
              <td>
                <button onClick={() => void loadMatches(j.id)}>
                  {selectedJob === j.id ? "↻ Reload matches" : "Explainable matches"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {matches && selectedJob && (
        <div className="card">
          <h3>Matches — why this candidate (deterministic, stored)</h3>
          <table>
            <thead><tr><th>Candidate</th><th>Score</th><th>Requirements</th></tr></thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.candidate.id}>
                  <td>
                    {m.candidate.display_name}
                    <div className="muted small">{m.candidate.email}</div>
                  </td>
                  <td><strong>{m.score}</strong></td>
                  <td>
                    <ul className="reqs">
                      {m.requirements.map((r, i) => (
                        <li key={i}>
                          <span className={`chip ${r.result === "MET" || r.result === "PASS" ? "ok" : r.result === "PARTIAL" ? "warn" : "bad"}`}>
                            {r.result}
                          </span>{" "}
                          {r.requirement}
                          {r.evidence.length > 0 && (
                            <span className="muted small"> · evidence: {r.evidence.map((e) => e.label).join(", ")}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3>Pipeline</h3>
      <table>
        <thead><tr><th>Candidate</th><th>Job</th><th>State</th><th>Actions</th></tr></thead>
        <tbody>
          {(applications.data?.applications ?? []).map((a) => (
            <tr key={a.id}>
              <td>{a.traineeName}</td>
              <td>{a.jobTitle}</td>
              <td><span className="chip">{a.state}</span></td>
              <td>
                {(TRANSITIONS[a.state] ?? []).map((s) => (
                  <button key={s} onClick={() => void transition(a.id, s)}>{s}</button>
                ))}{" "}
                {a.state === "JOINED" && !confirmed.has(a.id) && (
                  <button onClick={() => void confirmOutcome(a.id)}>Confirm joined</button>
                )}
              </td>
            </tr>
          ))}
          {(applications.data?.applications.length ?? 0) === 0 && (
            <tr><td colSpan={4} className="muted">No applications yet — apply from the trainee console.</td></tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
