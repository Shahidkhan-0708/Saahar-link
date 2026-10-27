import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api } from "../lib/api";
import { useAsync } from "./Login";

type Batch = { id: string; name: string };
type Session = { id: string; batchId: string; sessionDate: string };
type Status = {
  session: Session;
  events: { id: string; traineeUserId: string; method: string; result: string }[];
};
type Roster = { trainees: { traineeUserId: string; name: string; email: string }[] };
type Exception = { id: string; reason: string; status: string; traineeUserId: string };

/** Trainer console: attendance session + QR, roster, exception queue (AC6). */
export function Trainer() {
  const batches = useAsync(() => api<{ batches: Batch[] }>("/v1/batches"));
  const [batchId, setBatchId] = useState("");
  const [session, setSession] = useState<{ session: Session; qr_token: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const roster = useAsync<Roster>(
    () => api<Roster>(`/v1/batches/${batchId}/trainees`),
    [batchId],
  );
  const exceptions = useAsync(() =>
    api<{ exceptions: Exception[] }>("/v1/attendance/exceptions"),
  );

  async function createSession() {
    try {
      const res = await api<{ session: Session; qr_token: string }>(
        "/v1/attendance/sessions",
        { method: "POST", json: { batch_id: batchId, method: "QR" } },
      );
      setSession(res);
      setMsg(null);
      const url = await QRCode.toDataURL(res.qr_token, { width: 260, margin: 2 });
      setQrDataUrl(url);
      void refresh(res.session.id);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "failed");
    }
  }

  async function refresh(sessionId: string) {
    const res = await api<Status>(`/v1/attendance/sessions/${sessionId}/status`);
    setStatus(res);
  }

  useEffect(() => {
    if (session) {
      const timer = setInterval(() => void refresh(session.session.id), 5000);
      return () => clearInterval(timer);
    }
  }, [session]);

  async function resolve(id: string, resolution: "RESOLVED" | "REJECTED") {
    try {
      await api(`/v1/attendance/exceptions/${id}/resolve`, {
        method: "POST",
        json: { resolution, method: "MANUAL" },
      });
      setMsg(`Exception ${resolution.toLowerCase()} — signed manual event + audit row written`);
      exceptions.reload();
      if (session) void refresh(session.session.id);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "failed");
    }
  }

  const marked = new Set((status?.events ?? []).map((e) => e.traineeUserId));

  return (
    <section>
      <h1>Trainer · Attendance</h1>
      <div className="card inline-form">
        <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
          <option value="">Select batch…</option>
          {(batches.data?.batches ?? []).map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <button onClick={() => void createSession()} disabled={!batchId}>
          Start session (QR)
        </button>
        {session && (
          <button onClick={() => void refresh(session.session.id)}>↻ Refresh roster</button>
        )}
      </div>
      {msg && <p className="muted">{msg}</p>}

      <div className="grid-2">
        <div className="card">
          <h3>Session QR (refreshes every 5 min)</h3>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Attendance QR" />
          ) : (
            <p className="muted">No session yet.</p>
          )}
          <p className="muted">Trainees scan this with their camera or enter manually.</p>
        </div>
        <div className="card">
          <h3>Roster ({marked.size}/{roster.data?.trainees.length ?? 0} marked)</h3>
          <ul className="roster">
            {(roster.data?.trainees ?? []).map((t) => (
              <li key={t.traineeUserId}>
                <span>{t.name}</span>{" "}
                <span className={`chip ${marked.has(t.traineeUserId) ? "ok" : ""}`}>
                  {marked.has(t.traineeUserId) ? "MARKED" : "pending"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h3>Exception queue</h3>
      <ul>
        {(exceptions.data?.exceptions ?? [])
          .filter((e) => e.status === "OPEN")
          .map((e) => (
            <li key={e.id}>
              {e.reason}{" "}
              <button onClick={() => void resolve(e.id, "RESOLVED")}>Resolve (manual mark)</button>{" "}
              <button onClick={() => void resolve(e.id, "REJECTED")}>Reject</button>
            </li>
          ))}
        {(exceptions.data?.exceptions ?? []).filter((e) => e.status === "OPEN").length === 0 && (
          <li className="muted">Queue empty — failed captures land here, never a silent absence.</li>
        )}
      </ul>
    </section>
  );
}
