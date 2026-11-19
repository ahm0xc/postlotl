import { describe, expect, it, vi } from "vitest";

import type { TrackerConfig } from "./config";
import { replayQueuedCalls, type Tracker } from "./tracker";

const config: TrackerConfig = {
  projectSlug: "acme",
  host: "https://api.postlotl.com",
  autoPageview: true,
  performance: false,
  errors: false,
  heatmaps: false,
};

const createTracker = () => ({
  config,
  page: vi.fn(),
  track: vi.fn(),
  identify: vi.fn(),
});

describe("replayQueuedCalls", () => {
  it("replays queued calls in order", () => {
    const tracker = createTracker();

    replayQueuedCalls(
      [
        ["track", "early-event", { plan: "pro" }],
        ["page", { url: "/virtual", title: "Virtual" }],
        ["identify", "user_1", { role: "admin" }],
      ],
      tracker as unknown as Tracker,
    );

    expect(tracker.track).toHaveBeenCalledWith("early-event", { plan: "pro" });
    expect(tracker.page).toHaveBeenCalledWith({ url: "/virtual", title: "Virtual" });
    expect(tracker.identify).toHaveBeenCalledWith("user_1", { role: "admin" });
  });

  it("ignores malformed entries", () => {
    const tracker = createTracker();

    replayQueuedCalls(
      ["not-an-array", ["unknown-method", "x"], ["track"], ["identify", 42], []],
      tracker as unknown as Tracker,
    );

    expect(tracker.track).not.toHaveBeenCalled();
    expect(tracker.page).not.toHaveBeenCalled();
    expect(tracker.identify).not.toHaveBeenCalled();
  });
});
