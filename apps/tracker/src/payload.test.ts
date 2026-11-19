import { beforeEach, describe, expect, it } from "vitest";

import type { TrackerConfig } from "./config";
import {
  createEvent,
  createIdentify,
  createPageview,
  normalizeReferrer,
  sanitizeEventData,
} from "./payload";

const config: TrackerConfig = {
  projectSlug: "acme",
  host: "https://api.postlotl.com",
  autoPageview: true,
  performance: false,
  errors: false,
  heatmaps: false,
};

const identity = { visitorId: "visitor-1", sessionId: "session-1" };

beforeEach(() => {
  document.title = "Home";
  window.history.replaceState({}, "", "/");
});

describe("sanitizeEventData", () => {
  it("rounds numbers and truncates strings", () => {
    const result = sanitizeEventData({ price: 12.345678, note: "x".repeat(600) });

    expect(result?.price).toBe(12.3457);
    expect(String(result?.note)).toHaveLength(500);
  });

  it("joins arrays into a comma string", () => {
    expect(sanitizeEventData({ tags: ["a", "b", "c"] })?.tags).toBe("a,b,c");
  });

  it("drops unsupported values", () => {
    expect(sanitizeEventData({ fn: (() => undefined) as never, nan: Number.NaN })).toBeUndefined();
  });

  it("caps the number of keys", () => {
    const data = Object.fromEntries(Array.from({ length: 60 }, (_, index) => [`k${index}`, index]));

    expect(Object.keys(sanitizeEventData(data) ?? {})).toHaveLength(50);
  });
});

describe("normalizeReferrer", () => {
  it("keeps external referrers whole", () => {
    expect(normalizeReferrer("https://news.ycombinator.com/item?id=1", "https://shop.com")).toBe(
      "https://news.ycombinator.com/item?id=1",
    );
  });

  it("strips the origin from self-referrals", () => {
    expect(normalizeReferrer("https://shop.com/pricing?plan=pro", "https://shop.com")).toBe(
      "/pricing?plan=pro",
    );
  });

  it("drops empty and invalid referrers", () => {
    expect(normalizeReferrer("", "https://shop.com")).toBeUndefined();
    expect(normalizeReferrer("not a url", "https://shop.com")).toBeUndefined();
  });
});

describe("payload builders", () => {
  it("builds a pageview with identity and page data", () => {
    const body = createPageview(config, identity);

    expect(body.type).toBe("pageview");
    expect(body.payload).toMatchObject({
      projectSlug: "acme",
      visitorId: "visitor-1",
      sessionId: "session-1",
      url: "https://shop.com/",
      title: "Home",
      language: "en-US",
    });
    expect(typeof body.payload.timestamp).toBe("number");
  });

  it("includes the referrer only when provided", () => {
    expect(createPageview(config, identity, { referrer: "/pricing" }).payload.referrer).toBe(
      "/pricing",
    );
    expect("referrer" in createPageview(config, identity).payload).toBe(false);
  });

  it("honours url and title overrides", () => {
    const body = createPageview(config, identity, { url: "/virtual", title: "Virtual" });

    expect(body.payload.url).toBe("/virtual");
    expect(body.payload.title).toBe("Virtual");
  });

  it("trims and truncates event names", () => {
    expect(createEvent(config, identity, "  signup  ").payload.name).toBe("signup");
    expect(createEvent(config, identity, "x".repeat(80)).payload.name).toHaveLength(50);
  });

  it("builds identify with a trimmed distinct id and sanitized traits", () => {
    const body = createIdentify(config, identity, " user_123 ", { plan: "pro", seats: 3.33333 });

    expect(body.type).toBe("identify");
    expect(body.payload.distinctId).toBe("user_123");
    expect(body.payload.traits).toEqual({ plan: "pro", seats: 3.3333 });
  });
});
