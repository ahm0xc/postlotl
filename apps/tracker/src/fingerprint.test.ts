import { afterEach, describe, expect, it, vi } from "vitest";

const defineNavigator = (values: Record<string, unknown>): void => {
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(window.navigator, key, { value, configurable: true });
  }
};

const loadFingerprint = async () => {
  vi.resetModules();

  return import("./fingerprint");
};

const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.7390.55 Safari/537.36";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getVisitorId", () => {
  it("is deterministic for the same environment", async () => {
    defineNavigator({ userAgent: CHROME, language: "en-US", languages: ["en-US"] });

    const first = await (await loadFingerprint()).getVisitorId();
    const second = await (await loadFingerprint()).getVisitorId();

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{32}$/);
  });

  it("ignores the browser version inside the user agent", async () => {
    defineNavigator({ userAgent: CHROME, language: "en-US", languages: ["en-US"] });
    const first = await (await loadFingerprint()).getVisitorId();

    defineNavigator({ userAgent: CHROME.replace("141.0.7390.55", "142.0.8000.10") });
    const second = await (await loadFingerprint()).getVisitorId();

    expect(first).toBe(second);
  });

  it("changes when the language changes", async () => {
    defineNavigator({ userAgent: CHROME, language: "en-US", languages: ["en-US"] });
    const first = await (await loadFingerprint()).getVisitorId();

    defineNavigator({ language: "fr-FR", languages: ["fr-FR"] });
    const second = await (await loadFingerprint()).getVisitorId();

    expect(first).not.toBe(second);
  });

  it("changes when the screen changes", async () => {
    Object.defineProperty(window.screen, "width", { value: 1440, configurable: true });
    Object.defineProperty(window.screen, "height", { value: 900, configurable: true });

    defineNavigator({ userAgent: CHROME, language: "en-US", languages: ["en-US"] });
    const first = await (await loadFingerprint()).getVisitorId();

    Object.defineProperty(window.screen, "width", { value: 1920, configurable: true });
    const second = await (await loadFingerprint()).getVisitorId();

    expect(first).not.toBe(second);
  });
});
