import { afterEach, describe, expect, it, vi } from "vitest";

import { startClicks, type ClickTracker } from "./clicks";

let tracker: ClickTracker | undefined;

afterEach(() => {
  tracker?.stop();
  tracker = undefined;
  document.body.innerHTML = "";
});

const click = (element: Element): void => {
  element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
};

describe("startClicks", () => {
  it("sends an event with its data attributes", () => {
    const sendEvent = vi.fn();
    const button = document.createElement("button");

    button.setAttribute("data-track", "signup");
    button.setAttribute("data-track-plan", "pro");
    document.body.append(button);
    tracker = startClicks(sendEvent);

    click(button);

    expect(sendEvent).toHaveBeenCalledWith("signup", { plan: "pro" });
  });

  it("resolves the tracked ancestor for nested elements", () => {
    const sendEvent = vi.fn();
    const button = document.createElement("button");
    const label = document.createElement("span");

    button.setAttribute("data-track", "checkout");
    button.append(label);
    document.body.append(button);
    tracker = startClicks(sendEvent);

    click(label);

    expect(sendEvent).toHaveBeenCalledWith("checkout", {});
  });

  it("ignores elements without a track attribute", () => {
    const sendEvent = vi.fn();
    const button = document.createElement("button");

    document.body.append(button);
    tracker = startClicks(sendEvent);

    click(button);

    expect(sendEvent).not.toHaveBeenCalled();
  });

  it("ignores an empty event name", () => {
    const sendEvent = vi.fn();
    const button = document.createElement("button");

    button.setAttribute("data-track", "   ");
    document.body.append(button);
    tracker = startClicks(sendEvent);

    click(button);

    expect(sendEvent).not.toHaveBeenCalled();
  });

  it("stops listening after stop", () => {
    const sendEvent = vi.fn();
    const button = document.createElement("button");

    button.setAttribute("data-track", "signup");
    document.body.append(button);
    tracker = startClicks(sendEvent);
    tracker.stop();
    click(button);

    expect(sendEvent).not.toHaveBeenCalled();
    tracker = undefined;
  });
});
