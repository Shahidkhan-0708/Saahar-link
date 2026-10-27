import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  API_BASE,
  FABRIC_URL_KEY,
  clearSession,
  flushOutbox,
  getToken,
  getUser,
  outboxCounts,
} from "../lib/api";
import { type Lang, currentLang, setLang, t } from "../i18n";
import { CONSOLES, canAccess } from "../lib/guards";
import { Login, homeFor } from "../screens/Login";
import { Admin } from "../screens/Admin";
import { Learn, useConnectivity } from "../screens/Learn";
import { Trainer } from "../screens/Trainer";
import { Employer } from "../screens/Employer";
import { Audit, Verify } from "../screens/Public";

/** Redirect to /login when there is no session or the role may not enter. */
function requireConsole(pathname: string): void {
  const user = getUser();
  if (!getToken() || !user) {
    throw redirect({ to: "/login" });
  }
  if (!canAccess(user.role as never, pathname)) {
    throw redirect({ to: homeFor(user.role) });
  }
}

/** Online/Queued/Conflicts chip — MRD §8 first-class connectivity UI. */
function SyncChip() {
  const online = useConnectivity();
  const [counts, setCounts] = useState(outboxCounts());

  useEffect(() => {
    const update = () => setCounts(outboxCounts());
    window.addEventListener("sahakar:outbox", update);
    const timer = setInterval(() => {
      update();
      if (navigator.onLine) void flushOutbox().then(update);
    }, 5000);
    return () => {
      window.removeEventListener("sahakar:outbox", update);
      clearInterval(timer);
    };
  }, []);

  return (
    <span
      className="sync-chip"
      data-state={online ? (counts.queued > 0 ? "queued" : "online") : "offline"}
      title={`API ${API_BASE}${localStorage.getItem(FABRIC_URL_KEY) ? " · fabric paired" : ""}`}
    >
      {online ? t("sync.online") : t("sync.offline")} · {t("sync.synced")}{" "}
      {counts.total - counts.queued - counts.conflict - counts.dead} · {t("sync.queued")}{" "}
      {counts.queued}
      {counts.conflict > 0 && <> · {t("sync.conflicts")} {counts.conflict}</>}
    </span>
  );
}

function LangSwitch() {
  const [lang, setLangState] = useState<Lang>(currentLang());
  useEffect(() => {
    const handler = () => setLangState(currentLang());
    window.addEventListener("sahakar:lang", handler);
    return () => window.removeEventListener("sahakar:lang", handler);
  }, []);
  return (
    <select
      className="lang"
      aria-label="Language"
      value={lang}
      onChange={(e) => {
        setLang(e.target.value as Lang);
        setLangState(e.target.value as Lang);
      }}
    >
      <option value="en">English</option>
      <option value="hi">हिन्दी</option>
      <option value="mr">मराठी</option>
    </select>
  );
}

function Shell() {
  const user = getUser();
  const path = typeof window !== "undefined" ? window.location.pathname : "/";

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">Sahakar-Link ✦</Link>
        <nav>
          <Link to="/">{t("nav.home")}</Link>
          {CONSOLES.filter((c) => !user || (c.roles as string[]).includes(user.role)).map((c) => (
            <Link key={c.prefix} to={c.prefix as "/admin"}>
              {c.label}
            </Link>
          ))}
        </nav>
        <SyncChip />
        <LangSwitch />
        {user ? (
          <button
            className="ghost"
            onClick={() => {
              clearSession();
              window.location.href = "/login";
            }}
          >
            {t("nav.logout")} ({user.display_name})
          </button>
        ) : (
          <Link to="/login">{t("nav.login")}</Link>
        )}
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="muted small">
        {t("app.tagline")} · {path}
      </footer>
    </div>
  );
}

const rootRoute = createRootRoute({ component: Shell });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <section>
      <h1>Cooperative capacity building — offline-first</h1>
      <p>
        Nomination → training → verified credential → employment. Sign in to reach
        your console; every console keeps working when the network drops.
      </p>
    </section>
  ),
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
});

function guarded(prefix: "/admin" | "/trainer" | "/learn" | "/employer" | "/audit", component: () => React.JSX.Element) {
  return createRoute({
    getParentRoute: () => rootRoute,
    path: prefix,
    beforeLoad: ({ location }) => requireConsole(location.pathname),
    component,
  });
}

const adminRoute = guarded("/admin", () => <Admin />);
const trainerRoute = guarded("/trainer", () => <Trainer />);
const learnRoute = guarded("/learn", () => <Learn />);
const employerRoute = guarded("/employer", () => <Employer />);
const auditRoute = guarded("/audit", () => <Audit />);

const verifyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/verify/$credentialId",
  component: () => <Verify credentialId={useParamsCredentialId()} />,
});

function useParamsCredentialId(): string {
  // kept simple: read from location (route is public, no data dependencies)
  return window.location.pathname.split("/").pop() ?? "";
}

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  adminRoute,
  trainerRoute,
  learnRoute,
  employerRoute,
  auditRoute,
  verifyRoute,
]);

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: () => (
    <section>
      <h1>Not found</h1>
      <p>The page you asked for does not exist.</p>
    </section>
  ),
});

export type AppRouter = typeof router;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}
