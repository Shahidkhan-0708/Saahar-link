import { describe, expect, it } from "vitest";
import { canAccess, consoleFor, consolesFor } from "../src/lib/guards";

describe("role-gated console routing", () => {
  it("maps roles to their consoles", () => {
    expect(consolesFor("trainee").map((c) => c.prefix)).toEqual(["/learn"]);
    expect(consolesFor("trainer").map((c) => c.prefix)).toEqual(["/trainer"]);
    expect(consolesFor("employer").map((c) => c.prefix)).toEqual(["/employer"]);
  });

  it("denies cross-role access", () => {
    expect(canAccess("trainee", "/admin")).toBe(false);
    expect(canAccess("trainee", "/admin/programmes")).toBe(false);
    expect(canAccess("employer", "/audit")).toBe(false);
    expect(canAccess("trainer", "/learn")).toBe(false);
  });

  it("allows each role into its own console", () => {
    expect(canAccess("institution_admin", "/admin")).toBe(true);
    expect(canAccess("trainer", "/trainer/timetable")).toBe(true);
    expect(canAccess("trainee", "/learn")).toBe(true);
    expect(canAccess("auditor", "/audit")).toBe(true);
  });

  it("allows public paths for everyone", () => {
    expect(canAccess("trainee", "/login")).toBe(true);
    expect(canAccess("trainee", "/verify/abc")).toBe(true);
    expect(consoleFor("/login")).toBeNull();
  });
});
