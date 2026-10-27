import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { type ApiUser, api, setSession } from "../lib/api";
import { t } from "../i18n";

const HOME_BY_ROLE: Record<string, string> = {
  ncct_admin: "/admin",
  institution_admin: "/admin",
  platform_op: "/admin",
  trainer: "/trainer",
  trainee: "/learn",
  employer: "/employer",
  auditor: "/audit",
};

export function homeFor(role: string): string {
  return HOME_BY_ROLE[role] ?? "/";
}

/** Tiny data hook: load once, expose reload for refresh buttons. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    fn()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload };
}

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ token: string; user: ApiUser }>("/v1/auth/login", {
        method: "POST",
        json: { email, password },
      });
      setSession(res.token, res.user);
      void navigate({ to: homeFor(res.user.role) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card narrow">
      <h1>{t("login.title")}</h1>
      <form onSubmit={submit}>
        <label>
          {t("login.email")}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label>
          {t("login.password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? "…" : t("login.submit")}
        </button>
      </form>
      <p className="muted">
        Demo accounts: admin@demo.in · trainer@demo.in · trainee@demo.in ·
        employer@demo.in · auditor@demo.in (password in seed)
      </p>
    </section>
  );
}
