import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TrackerConfig } from "./config";
import { getSession } from "./session";

const createConfig = (projectSlug: string): TrackerConfig => ({
  projectSlug,
  host: "https://api.postlotl.com",
  autoPageview: true,
  performance: false,
  errors: false,
  heatmaps: false,
});

beforeEach(() => {
  window.sessionStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("getSession", () => {
  it("reports a new session on the first call only", () => {
    const config = createConfig("acme");

    expect(getSession(config)).toEqual({ id: expect.any(String), isNew: true });
    expect(getSession(config).isNew).toBe(false);
  });

  it("returns the same session id within the idle window", () => {
    const config = createConfig("acme");
    const first = getSession(config).id;

    vi.setSystemTime(new Date("2026-01-01T00:29:00Z"));

    expect(getSession(config).id).toBe(first);
  });

  it("starts a new session after 30 minutes of inactivity", () => {
    const config = createConfig("acme");
    const first = getSession(config).id;

    vi.setSystemTime(new Date("2026-01-01T00:31:00Z"));

    const next = getSession(config);

    expect(next.isNew).toBe(true);
    expect(next.id).not.toBe(first);
  });

  it("keeps sessions separate per project", () => {
    expect(getSession(createConfig("one")).id).not.toBe(getSession(createConfig("two")).id);
  });

  it("keeps the session when writes fail but reads succeed", () => {
    vi.spyOn(window.sessionStorage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    const config = createConfig("partial-write");
    const first = getSession(config);
    const second = getSession(config);

    expect(second.id).toBe(first.id);
    expect(second.isNew).toBe(false);
  });

  it("falls back to memory when sessionStorage throws", async () => {
    vi.resetModules();
    vi.spyOn(window.sessionStorage, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    const { getSession: getSessionWithBlockedStorage } = await import("./session");
    const config = createConfig("blocked");

    const first = getSessionWithBlockedStorage(config).id;

    vi.setSystemTime(new Date("2026-01-01T00:10:00Z"));

    expect(getSessionWithBlockedStorage(config).id).toBe(first);
  });
});
