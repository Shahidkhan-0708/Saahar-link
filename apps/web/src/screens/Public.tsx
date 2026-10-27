import { api } from "../lib/api";
import { useAsync } from "./Login";

type AuditRow = {
  id: number;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  at: string;
};

export function Audit() {
  const { data, error, reload } = useAsync(() =>
    api<{ audit_logs: AuditRow[] }>("/v1/audit-logs?limit=200"),
  );

  return (
    <section>
      <h1>Audit trail (read-only)</h1>
      <button onClick={reload}>↻ Refresh</button>
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr><th>When</th><th>Action</th><th>Entity</th><th>Entity ID</th></tr>
        </thead>
        <tbody>
          {(data?.audit_logs ?? []).map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.at).toLocaleString()}</td>
              <td><code>{r.action}</code></td>
              <td>{r.entityType}</td>
              <td className="small muted">{r.entityId.slice(0, 8)}…</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">append-only — no edit or delete action exists anywhere in this console.</p>
    </section>
  );
}

type VerifyResult = {
  valid: boolean;
  status: string | null;
  subject_display_name?: string;
  programme?: string;
  skills?: string[];
  issued_at?: string;
  reason_if_invalid: string | null;
};

/** Public QR target (AC7) — no auth, fail-closed states rendered explicitly. */
export function Verify({ credentialId }: { credentialId: string }) {
  const { data, error, loading } = useAsync(() =>
    api<VerifyResult>(`/v1/credentials/${credentialId}/verify`),
  );

  return (
    <section className="card narrow">
      <h1>Credential verification</h1>
      {loading && <p className="muted">Verifying…</p>}
      {error && <p className="error">Cannot verify: {error}</p>}
      {data && (
        <div>
          <p>
            <span className={`chip ${data.valid ? "ok" : "bad"}`}>
              {data.valid ? "VALID" : "NOT VALID"}
            </span>{" "}
            <strong>{data.status ?? "UNKNOWN"}</strong>
          </p>
          {data.valid ? (
            <ul>
              <li><strong>{data.subject_display_name}</strong></li>
              <li>{data.programme}</li>
              <li>Skills: {data.skills?.join(", ")}</li>
              <li>Issued: {data.issued_at ? new Date(data.issued_at).toLocaleDateString() : "—"}</li>
            </ul>
          ) : (
            <p className="error">
              Reason: {data.reason_if_invalid ?? "UNKNOWN"} — this page fails closed
              for unknown, tampered or revoked credentials.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
