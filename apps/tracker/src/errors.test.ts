import { afterEach, describe, expect, it, vi } from "vitest";

import { startErrors, type ErrorTracker } from "./errors";

let tracker: ErrorTracker | undefined;

afterEach(() => {
  tracker?.stop();
  tracker = undefined;
});

const throwError = (message: string, line = 1): void => {
  window.dispatchEvent(new ErrorEvent("error", { message, filename: "app.js", lineno: line }));
};

describe("startErrors", () => {
  it("suppresses duplicate errors", () => {
    const send = vi.fn();

    tracker = startErrors(send);
    throwError("boom");
    throwError("boom");

    expect(send).toHaveBeenCalledOnce();
  });

  it("caps reports per page", () => {
    const send = vi.fn();

    tracker = startErrors(send);

    for (let index = 0; index < 30; index += 1) {
      throwError(`boom ${index}`, index);
    }

    expect(send).toHaveBeenCalledTimes(20);
  });
});
