import type { VitalsMetrics } from "./types";

const FLUSH_TIMEOUT = 10_000;
const INTERACTION_THRESHOLD = 40;

type Entry = PerformanceEntry & {
  value?: number;
  hadRecentInput?: boolean;
  interactionId?: number;
  activationStart?: number;
  responseStart?: number;
};

export type VitalsTracker = {
  flush: () => void;
  stop: () => void;
};

export const startVitals = (send: (metrics: VitalsMetrics, url: string) => void): VitalsTracker => {
  const { performance, document } = window;
  const observers: PerformanceObserver[] = [];

  let metrics: VitalsMetrics = { duration: 0 };
  let routeUrl = window.location.href;
  let activationStart = 0;
  let pageStartTime = performance.now();
  let isInitialLoad = true;
  let sent = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let clsSessionValue = 0;
  let clsSessionEntries: Entry[] = [];
  let interactions: Record<number, number> = {};
  let inpObserver: PerformanceObserver | undefined;

  const getEntries = (type: string): Entry[] => {
    try {
      return (performance.getEntriesByType(type) as Entry[]) ?? [];
    } catch {
      return [];
    }
  };

  const getFirstHiddenTime = (): number => {
    const typedDocument = document as Document & { prerendering?: boolean };

    if (typedDocument.prerendering) {
      return Infinity;
    }

    const navigation = getEntries("navigation")[0];
    const startedAt = navigation?.activationStart ?? 0;
    const hidden = getEntries("visibility-state").find(
      (entry) => entry.name === "hidden" && entry.startTime >= startedAt,
    );

    return hidden?.startTime ?? (document.visibilityState === "hidden" ? 0 : Infinity);
  };

  let firstHiddenTime = getFirstHiddenTime();

  const clearTimer = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const observe = (type: string, callback: (entry: Entry) => void): void => {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          callback(entry as Entry);
        }
      });

      observer.observe({ type, buffered: true } as PerformanceObserverInit);
      observers.push(observer);
    } catch {
      return;
    }
  };

  observe("navigation", (entry) => {
    activationStart = entry.activationStart ?? 0;

    if (entry.responseStart !== undefined) {
      metrics.ttfb = Math.max(entry.responseStart - activationStart, 0);
    }
  });

  observe("paint", (entry) => {
    if (
      isInitialLoad &&
      entry.name === "first-contentful-paint" &&
      entry.startTime < firstHiddenTime
    ) {
      metrics.fcp = Math.max(entry.startTime - activationStart, 0);
    }
  });

  observe("largest-contentful-paint", (entry) => {
    if (isInitialLoad && entry.startTime < firstHiddenTime) {
      metrics.lcp = Math.max(entry.startTime - activationStart, 0);
    }
  });

  observe("layout-shift", (entry) => {
    if (entry.hadRecentInput) {
      return;
    }

    const lastEntry = clsSessionEntries[clsSessionEntries.length - 1];
    const firstEntry = clsSessionEntries[0];

    if (
      lastEntry &&
      firstEntry &&
      entry.startTime - lastEntry.startTime - (lastEntry.duration ?? 0) < 1_000 &&
      entry.startTime - firstEntry.startTime < 5_000
    ) {
      clsSessionValue += entry.value ?? 0;
      clsSessionEntries.push(entry);
    } else {
      clsSessionValue = entry.value ?? 0;
      clsSessionEntries = [entry];
    }

    if (clsSessionValue > (metrics.cls ?? 0)) {
      metrics.cls = clsSessionValue;
    }
  });

  const recordInteractions = (entries: Entry[]): void => {
    for (const entry of entries) {
      if (entry.interactionId) {
        const existing = interactions[entry.interactionId];

        if (!existing || entry.duration > existing) {
          interactions[entry.interactionId] = entry.duration;
        }
      }
    }
  };

  try {
    inpObserver = new PerformanceObserver((list) =>
      recordInteractions(list.getEntries() as Entry[]),
    );
    inpObserver.observe({
      type: "event",
      buffered: true,
      durationThreshold: INTERACTION_THRESHOLD,
    } as PerformanceObserverInit);
    observers.push(inpObserver);
  } catch {
    inpObserver = undefined;
  }

  const computeInp = (): void => {
    if (inpObserver) {
      recordInteractions(inpObserver.takeRecords() as Entry[]);
    }

    // oxlint-disable-next-line unicorn/no-array-sort -- toSorted is ES2023, outside the ES2020 baseline
    const values = Object.values(interactions).sort((left, right) => right - left);

    if (values.length > 0) {
      const index = Math.floor(Math.max(values.length, 10) * 0.02);
      metrics.inp = values[Math.min(index, values.length - 1)];
    }
  };

  const applyFallbacks = (): void => {
    if (!isInitialLoad) {
      return;
    }

    if (metrics.ttfb === undefined) {
      const navigation = getEntries("navigation")[0];

      if (navigation?.responseStart !== undefined) {
        metrics.ttfb = Math.max(navigation.responseStart - (navigation.activationStart ?? 0), 0);
      }
    }

    if (metrics.fcp === undefined) {
      const paint = getEntries("paint").find((entry) => entry.name === "first-contentful-paint");

      if (paint && paint.startTime < firstHiddenTime) {
        metrics.fcp = Math.max(paint.startTime - activationStart, 0);
      }
    }

    if (metrics.lcp === undefined) {
      const entries = getEntries("largest-contentful-paint");
      const largest = entries[entries.length - 1];

      if (largest && largest.startTime < firstHiddenTime) {
        metrics.lcp = Math.max(largest.startTime - activationStart, 0);
      }
    }
  };

  const sendMetrics = (): void => {
    if (sent) {
      return;
    }

    applyFallbacks();
    computeInp();

    metrics.duration = Math.round(performance.now() - pageStartTime);
    sent = true;

    clearTimer();
    send({ ...metrics }, routeUrl);
  };

  const reset = (): void => {
    metrics = { duration: 0 };
    routeUrl = window.location.href;
    isInitialLoad = false;
    activationStart = 0;
    pageStartTime = performance.now();
    clsSessionValue = 0;
    clsSessionEntries = [];
    interactions = {};
    sent = false;
    clearTimer();
    timer = setTimeout(sendMetrics, FLUSH_TIMEOUT);
  };

  const flush = (): void => {
    sendMetrics();
    reset();
  };

  const onVisibilityChange = (event: Event): void => {
    if (document.visibilityState !== "hidden") {
      return;
    }

    if (firstHiddenTime === Infinity) {
      firstHiddenTime = event.timeStamp || performance.now();
    }

    sendMetrics();
  };

  timer = setTimeout(sendMetrics, FLUSH_TIMEOUT);

  document.addEventListener("visibilitychange", onVisibilityChange, true);
  window.addEventListener("pagehide", sendMetrics);

  return {
    flush,
    stop: () => {
      clearTimer();

      for (const observer of observers) {
        observer.disconnect();
      }

      document.removeEventListener("visibilitychange", onVisibilityChange, true);
      window.removeEventListener("pagehide", sendMetrics);
    },
  };
};
