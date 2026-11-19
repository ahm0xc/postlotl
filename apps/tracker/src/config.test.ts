import { describe, expect, it } from "vitest";

import { readConfig } from "./config";

const createScript = (attributes: Record<string, string>): HTMLScriptElement =>
  ({
    getAttribute: (name: string) => attributes[name] ?? null,
  }) as unknown as HTMLScriptElement;

describe("readConfig", () => {
  it("reads the slug, host, and feature flags", () => {
    const config = readConfig(
      createScript({
        "data-project-slug": "acme",
        "data-host": "https://api.postlotl.com/",
        "data-performance": "true",
        "data-errors": "true",
        "data-heatmaps": "true",
      }),
    );

    expect(config).toEqual({
      projectSlug: "acme",
      host: "https://api.postlotl.com",
      autoPageview: true,
      performance: true,
      errors: true,
      heatmaps: true,
    });
  });

  it("only disables auto pageview for the literal false", () => {
    const base = { "data-project-slug": "acme", "data-host": "https://api.postlotl.com" };

    expect(readConfig(createScript({ ...base, "data-auto-pageview": "false" })).autoPageview).toBe(
      false,
    );
    expect(readConfig(createScript({ ...base, "data-auto-pageview": "0" })).autoPageview).toBe(
      true,
    );
    expect(readConfig(createScript(base)).autoPageview).toBe(true);
  });

  it("normalizes the host", () => {
    const config = readConfig(
      createScript({
        "data-project-slug": "acme",
        "data-host": "https://api.postlotl.com/base//?token=1#hash",
      }),
    );

    expect(config.host).toBe("https://api.postlotl.com/base");
  });

  it("allows http for local addresses", () => {
    for (const host of [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://192.168.1.5:3000",
      "http://app.local",
    ]) {
      const config = readConfig(createScript({ "data-project-slug": "acme", "data-host": host }));

      expect(config.host).toBe(host);
    }
  });

  it("rejects http for remote hosts", () => {
    expect(() =>
      readConfig(
        createScript({ "data-project-slug": "acme", "data-host": "http://api.postlotl.com" }),
      ),
    ).toThrow(/https/);
  });

  it("accepts https for remote hosts", () => {
    expect(
      readConfig(
        createScript({ "data-project-slug": "acme", "data-host": "https://api.postlotl.com" }),
      ).host,
    ).toBe("https://api.postlotl.com");
  });

  it("throws when the project slug is missing", () => {
    expect(() => readConfig(createScript({ "data-host": "https://api.postlotl.com" }))).toThrow(
      /data-project-slug/,
    );
  });

  it("throws when the host is missing", () => {
    expect(() => readConfig(createScript({ "data-project-slug": "acme" }))).toThrow(/data-host/);
  });

  it("throws on a relative host", () => {
    expect(() =>
      readConfig(createScript({ "data-project-slug": "acme", "data-host": "api.postlotl.com" })),
    ).toThrow(/absolute URL/);
  });

  it("throws on a non-http protocol", () => {
    expect(() =>
      readConfig(
        createScript({ "data-project-slug": "acme", "data-host": "ftp://api.postlotl.com" }),
      ),
    ).toThrow(/http\(s\)/);
  });

  it("throws when there is no script element", () => {
    expect(() => readConfig(null)).toThrow(/data-project-slug/);
  });
});
