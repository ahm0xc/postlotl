import { startClicks } from "./clicks";
import type { TrackerConfig } from "./config";
import { startErrors } from "./errors";
import { getVisitorId } from "./fingerprint";
import { startHeatmaps } from "./heatmaps";
import type { PageOptions } from "./options";
import { startPageviews } from "./pageviews";
import {
  createError,
  createEvent,
  createHeatmap,
  createIdentify,
  createPageview,
  createPerformance,
} from "./payload";
import { getSession } from "./session";
import { sendCollect, type SendOptions } from "./transport";
import type { CollectBody, EventData, Identity } from "./types";
import { startVitals } from "./vitals";

export type Tracker = {
  config: TrackerConfig;
  page: (options?: PageOptions) => void;
  track: (name: string, data?: EventData) => void;
  identify: (id: string, traits?: EventData) => void;
};

export type QueuedCall = unknown[];

const isQueuedCall = (value: unknown): value is QueuedCall =>
  Array.isArray(value) && typeof value[0] === "string";

export const replayQueuedCalls = (queue: unknown[], tracker: Tracker): void => {
  for (const entry of queue) {
    if (!isQueuedCall(entry)) {
      continue;
    }

    const [method, ...args] = entry;

    if (method === "track" && typeof args[0] === "string") {
      tracker.track(args[0], args[1] as EventData | undefined);
    } else if (method === "page") {
      tracker.page(args[0] as PageOptions | undefined);
    } else if (method === "identify" && typeof args[0] === "string") {
      tracker.identify(args[0], args[1] as EventData | undefined);
    }
  }
};

export const startTracker = (config: TrackerConfig): Tracker => {
  const initialSession = getSession(config);

  const send = (build: (identity: Identity) => CollectBody, options?: SendOptions): void => {
    void getVisitorId()
      .then((visitorId) => {
        const identity = { visitorId, sessionId: getSession(config).id };

        return sendCollect(config, build(identity), options);
      })
      .catch(() => undefined);
  };

  const track = (name: string, data?: EventData): void => {
    const eventName = name.trim();

    if (!eventName) {
      return;
    }

    send((identity) => createEvent(config, identity, eventName, data));
  };

  const page = (options?: PageOptions): void => {
    send((identity) => createPageview(config, identity, options));
  };

  const identify = (id: string, traits?: EventData): void => {
    const distinctId = id.trim();

    if (!distinctId) {
      return;
    }

    send((identity) => createIdentify(config, identity, distinctId, traits));
  };

  const vitals = config.performance
    ? startVitals((metrics, url) => {
        send((identity) => createPerformance(config, identity, metrics, { url }));
      })
    : undefined;

  if (config.autoPageview || vitals) {
    startPageviews(
      config.autoPageview
        ? (referrer?: string) => {
            send((identity) =>
              createPageview(config, identity, {
                referrer: initialSession.isNew ? referrer : undefined,
              }),
            );
          }
        : undefined,
      vitals?.flush,
    );
  }

  startClicks((name, data) => {
    send((identity) => createEvent(config, identity, name, data));
  });

  if (config.errors) {
    startErrors((report) => {
      send((identity) => createError(config, identity, report), { retries: 3 });
    });
  }

  if (config.heatmaps) {
    startHeatmaps((events) => {
      send((identity) => createHeatmap(config, identity, events));
    });
  }

  return { config, page, track, identify };
};
