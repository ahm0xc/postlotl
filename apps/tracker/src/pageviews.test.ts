import { afterEach, describe, expect, it, vi } from "vitest";

import { startPageviews, type PageviewTracker } from "./pageviews";

let tracker: PageviewTracker | undefined;

afterEach(() => {
  tracker?.stop();
  tracker = undefined;
  vi.useRealTimers();
  window.history.replaceState({}, "", "/");
});

describe("startPageviews", () => {
  it("sends the initial pageview immediately", () => {
    const send = vi.fn();

    tracker = startPageviews(send);

    expect(send).toHaveBeenCalledOnce();
  });

  it("debounces navigations and skips unchanged urls", () => {
    vi.useFakeTimers();

    const send = vi.fn();

    tracker = startPageviews(send);
    send.mockClear();

    window.history.pushState({}, "", "/pricing");
    vi.advanceTimersByTime(299);
    expect(send).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(send).toHaveBeenCalledOnce();

    window.history.pushState({}, "", "/pricing");
    vi.advanceTimersByTime(300);
    expect(send).toHaveBeenCalledOnce();
  });

  it("reports navigations without a pageview sender", () => {
    const onNavigate = vi.fn();

    tracker = startPageviews(undefined, onNavigate);

    window.history.pushState({}, "", "/a");
    expect(onNavigate).toHaveBeenCalledOnce();

    window.history.pushState({}, "", "/a");
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("reports back/forward navigation", () => {
    const onNavigate = vi.fn();

    tracker = startPageviews(undefined, onNavigate);
    window.history.pushState({}, "", "/b");
    onNavigate.mockClear();

    Object.getPrototypeOf(window.history).replaceState.call(window.history, {}, "", "/c");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("triggers navigations when the hash changes", () => {
    const onNavigate = vi.fn();

    tracker = startPageviews(undefined, onNavigate);

    Object.getPrototypeOf(window.history).replaceState.call(window.history, {}, "", "/#section");
    window.dispatchEvent(new HashChangeEvent("hashchange"));

    expect(onNavigate).toHaveBeenCalledOnce();
  });
});
