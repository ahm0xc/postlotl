import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TrackerConfig } from "./config";
import { getCollectUrl, sendCollect } from "./transport";

const config: TrackerConfig = {
  projectSlug: "acme",
  host: "https://api.postlotl.com",
  autoPageview: true,
  performance: false,
  errors: false,
  heatmaps: false,
};

const body = {
  type: "pageview" as const,
  payload: {
    projectSlug: "acme",
    visitorId: "visitor-1",
    sessionId: "session-1",
    url: "https://shop.com/",
    title: "Home",
    screen: "1440x900",
    language: "en-US",
    timezone: "UTC",
    timestamp: 1,
  },
};

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("getCollectUrl", () => {
  it("appends the collect path to the host", () => {
    expect(getCollectUrl("https://api.postlotl.com")).toBe("https://api.postlotl.com/api/collect");
  });
});

describe("sendCollect", () => {
  it("posts the body as keepalive JSON", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await sendCollect(config, body);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.postlotl.com/api/collect");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      keepalive: true,
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  });

  it("drops bodies over the keepalive limit", async () => {
    await sendCollect(config, {
      ...body,
      payload: { ...body.payload, url: "x".repeat(70_000) },
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("swallows network errors", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    await expect(sendCollect(config, body)).resolves.toBeUndefined();
  });

  it("does not retry a client error", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400 });

    await sendCollect(config, body, { retries: 3 });

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("retries a failing request", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });

    const pending = sendCollect(config, body, { retries: 1 });

    await vi.advanceTimersByTimeAsync(1_000);
    await pending;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
