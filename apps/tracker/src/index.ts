import { readConfig } from "./config";
import { replayQueuedCalls, startTracker, type Tracker } from "./tracker";

type TrackerWindow = Window &
  typeof globalThis & {
    postlotl?: Tracker | unknown[];
  };

((window: TrackerWindow) => {
  const existing = window.postlotl;

  if (existing && !Array.isArray(existing)) {
    return;
  }

  const config = Object.freeze(readConfig(window.document.currentScript));
  const tracker = startTracker(config);

  window.postlotl = tracker;

  if (Array.isArray(existing)) {
    replayQueuedCalls(existing, tracker);
  }
})(window as TrackerWindow);
