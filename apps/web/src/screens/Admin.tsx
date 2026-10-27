import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useAsync } from "./Login";

type Programme = {
  id: string;
  title: string;
  category: string;
  capacity: number;
  status: string;
  version: number;
  nominationOpens: string | null;
  nominationCloses: string | null;
};

type Nomination = {
  id: string;
  status: string;
  traineeName: string;
  programmeTitle: string;
};

type Batch = { id: string; name: string; startDate: string; endDate: string };

type SyncRow = { event_id: string; event_type: string; entity_type: string; state: string };

const TABS = ["Programmes", "Nominations", "Batches", "Review"] as const;

export function Admin() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Programmes");
  return (
    <section>
      <h1>Administration</h1>
      <nav className="tabs">
        {TABS.map((tb) => (
          <button
            key={tb}
            className={tb === tab ? "active" : ""}
            onClick={() => setTab(tb)}
          >
            {tb}
          </button>
        ))}
      </nav>
      {tab === "Programmes" && <Programmes />}
      {tab === "Nominations" && <Nominations />}
      {tab === "Batches" && <Batches />}
      {tab === "Review" && <Review />}
    </section>
  );
}

function Programmes() {
  const { data, reload, error } = useAsync(() =>
    api<{ programmes: Programme[] }>("/v1/programmes"),
  );
  const [form, setForm] = useState({ title: "", category: "accounting", capacity: 8 });
  const [msg, setMsg] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/v1/programmes", { method: "POST", json: { ...form } });
      setMsg("Programme created");
      setForm({ title: "", category: "accounting", capacity: 8 });
      reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "failed");
    }
  }

  async function openWindow(p: Programme) {
    try {
      await api(`/v1/programmes/${p.id}`, {
        method: "PATCH",
        json: {
          status: "OPEN",
          nomination_opens: new Date(Date.now() - 3600_000).toISOString(),
          nomination_closes: new Date(Date.now() + 7 * 86400_000).toISOString(),
          version: p.version,
        },
      });
      setMsg(`Nominations open for “${p.title}”`);
      reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "failed");
    }
  }

  return (
    <div>
      <form className="card inline-form" onSubmit={create}>
        <input
          placeholder="Programme title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          minLength={3}
        />
        <input
          placeholder="Category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          required
        />
        <input
          type="number"
          min={1}
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
          required
        />
        <button type="submit">Create programme</button>
      </form>
      {msg && <p className="muted">{msg}</p>}
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Title</th><th>Category</th><th>Capacity</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          {(data?.programmes ?? []).map((p) => (
            <tr key={p.id}>
              <td>{p.title}</td>
              <td>{p.category}</td>
              <td>{p.capacity}</td>
              <td><span className={`chip ${p.status.toLowerCase()}`}>{p.status}</span></td>
              <td>
                {p.status !== "OPEN" && (
                  <button onClick={() => void openWindow(p)}>Open nominations</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Nominations() {
  const { data, reload, error } = useAsync(() =>
    api<{ nominations: Nomination[] }>("/v1/nominations"),
  );
  const [msg, setMsg] = useState<string | null>(null);

  async function decide(id: string, decision: string) {
    try {
      await api(`/v1/nominations/${id}/decision`, {
        method: "PATCH",
        json: { decision },
      });
      setMsg(`Nomination ${decision.toLowerCase()}`);
      reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "failed");
    }
  }

  const pending = (data?.nominations ?? []).filter((n) => n.status !== "APPROVED");

  return (
    <div>
      {msg && <p className="muted">{msg}</p>}
      {error && <p className="error">{error}</p>}
      <button
        onClick={async () => {
          for (const n of pending) await decide(n.id, "APPROVED");
        }}
        disabled={pending.length === 0}
      >
        Approve all pending ({pending.length})
      </button>
      <table>
        <thead>
          <tr><th>Trainee</th><th>Programme</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {(data?.nominations ?? []).map((n) => (
            <tr key={n.id}>
              <td>{n.traineeName}</td>
              <td>{n.programmeTitle}</td>
              <td><span className="chip">{n.status}</span></td>
              <td>
                {n.status !== "APPROVED" && (
                  <>
                    <button onClick={() => void decide(n.id, "APPROVED")}>Approve</button>{" "}
                    <button onClick={() => void decide(n.id, "REJECTED")}>Reject</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Batches() {
  const { data, reload, error } = useAsync(() =>
    api<{ batches: Batch[] }>("/v1/batches"),
  );
  const { data: programmes } = useAsync(() =>
    api<{ programmes: Programme[] }>("/v1/programmes"),
  );
  const [form, setForm] = useState({
    programme_id: "",
    name: "",
    start_date: "2026-10-12",
    end_date: "2026-11-12",
  });
  const [msg, setMsg] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      const res = await api<{ trainees_added: number }>("/v1/batches", {
        method: "POST",
        json: { ...form, from_approved_nominations: true },
      });
      setMsg(`Batch formed with ${res.trainees_added} trainee(s) from approved nominations`);
      reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "failed");
    }
  }

  return (
    <div>
      <form className="card inline-form" onSubmit={create}>
        <select
          value={form.programme_id}
          onChange={(e) => setForm({ ...form, programme_id: e.target.value })}
          required
        >
          <option value="">Select programme…</option>
          {(programmes?.programmes ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <input
          placeholder="Batch name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        <button type="submit">Form batch</button>
      </form>
      {msg && <p className="muted">{msg}</p>}
      {error && <p className="error">{error}</p>}
      <table>
        <thead><tr><th>Name</th><th>Start</th><th>End</th></tr></thead>
        <tbody>
          {(data?.batches ?? []).map((b) => (
            <tr key={b.id}><td>{b.name}</td><td>{b.startDate}</td><td>{b.endDate}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Conflict / dead-letter review (blueprint §6.4). */
function Review() {
  const conflicts = useAsync(() =>
    api<{ conflicts: SyncRow[] }>("/v1/sync/conflicts"),
  );
  const dead = useAsync(() => api<{ dead_letters: SyncRow[] }>("/v1/sync/dead-letters"));
  const [msg, setMsg] = useState<string | null>(null);

  async function resolve(eventId: string, resolution: "KEEP_CLOUD" | "ACCEPT_REMOTE") {
    try {
      await api(`/v1/sync/conflicts/${eventId}/resolve`, {
        method: "POST",
        json: { resolution },
      });
      setMsg("Conflict resolved and audited");
      conflicts.reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "failed");
    }
  }

  return (
    <div className="grid-2">
      <div>
        <h3>Conflicts ({conflicts.data?.conflicts.length ?? 0})</h3>
        {msg && <p className="muted">{msg}</p>}
        <ul>
          {(conflicts.data?.conflicts ?? []).map((c) => (
            <li key={c.event_id}>
              <code>{c.event_type}</code> · {c.entity_type}{" "}
              <button onClick={() => void resolve(c.event_id, "KEEP_CLOUD")}>Keep cloud</button>{" "}
              <button onClick={() => void resolve(c.event_id, "ACCEPT_REMOTE")}>Accept device</button>
            </li>
          ))}
          {(conflicts.data?.conflicts.length ?? 0) === 0 && <li className="muted">None</li>}
        </ul>
      </div>
      <div>
        <h3>Dead letters ({dead.data?.dead_letters.length ?? 0})</h3>
        <ul>
          {(dead.data?.dead_letters ?? []).map((d) => (
            <li key={d.event_id}>
              <code>{d.event_type}</code> — quarantined, not applied
            </li>
          ))}
          {(dead.data?.dead_letters.length ?? 0) === 0 && <li className="muted">None</li>}
        </ul>
      </div>
    </div>
  );
}
