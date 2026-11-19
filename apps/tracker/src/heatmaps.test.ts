import { afterEach, describe, expect, it, vi } from "vitest";

import { startHeatmaps, type HeatmapTracker } from "./heatmaps";
import type { HeatmapEvent } from "./types";

let tracker: HeatmapTracker | undefined;

afterEach(() => {
  tracker?.stop();
  tracker = undefined;
  document.body.innerHTML = "";
});

const click = (element: Element): void => {
  element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
};

describe("startHeatmaps", () => {
  it("escapes class names into a valid selector", () => {
    const send = vi.fn<(events: HeatmapEvent[]) => void>();
    const button = document.createElement("button");

    button.className = "bg-blue-500 hover:bg-blue-600 px-4";
    document.body.append(button);
    tracker = startHeatmaps(send);

    click(button);
    tracker.flush();

    const events = send.mock.calls[0]?.[0] ?? [];
    const selector = events[0]?.type === "click" ? events[0].selector : undefined;

    expect(selector).toBe("button.bg-blue-500.hover\\:bg-blue-600");
    expect(() => document.querySelector(selector as string)).not.toThrow();
  });

  it("escapes ids", () => {
    const send = vi.fn<(events: HeatmapEvent[]) => void>();
    const button = document.createElement("button");

    button.id = "cta:primary";
    document.body.append(button);
    tracker = startHeatmaps(send);

    click(button);
    tracker.flush();

    const events = send.mock.calls[0]?.[0] ?? [];

    expect(events[0]?.type === "click" ? events[0].selector : undefined).toBe("#cta\\:primary");
  });

  it("batches clicks until flush", () => {
    const send = vi.fn<(events: HeatmapEvent[]) => void>();
    const button = document.createElement("button");

    button.className = "cta";
    document.body.append(button);
    tracker = startHeatmaps(send);

    click(button);
    click(button);
    expect(send).not.toHaveBeenCalled();

    tracker.flush();

    expect(send.mock.calls[0]?.[0]).toHaveLength(2);
  });
});
