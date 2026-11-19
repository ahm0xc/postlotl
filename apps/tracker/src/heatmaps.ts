import type { HeatmapEvent } from "./types";

const FLUSH_INTERVAL = 10_000;
const MAX_EVENTS = 50;
const MAX_SELECTOR_CLASSES = 2;

export type HeatmapTracker = {
  flush: () => void;
  stop: () => void;
};

export type HeatmapSender = (events: HeatmapEvent[]) => void;

const escapeIdentifier = (value: string): string => {
  if (typeof window.CSS?.escape === "function") {
    return window.CSS.escape(value);
  }

  return value.replace(/([^a-zA-Z0-9_-])/g, "\\$1");
};

const getSelector = (element: Element): string => {
  if (element.id) {
    return `#${escapeIdentifier(element.id)}`;
  }

  const tag = element.tagName.toLowerCase();
  const classes = element.classList
    ? Array.from(element.classList).slice(0, MAX_SELECTOR_CLASSES)
    : [];

  return classes.length > 0 ? `${tag}.${classes.map(escapeIdentifier).join(".")}` : tag;
};

export const startHeatmaps = (send: HeatmapSender): HeatmapTracker => {
  const { document } = window;

  let events: HeatmapEvent[] = [];
  let maxScrollPct = 0;
  let frame = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  const flush = (): void => {
    if (maxScrollPct > 0) {
      events.push({ type: "scroll", scrollPct: maxScrollPct });
      maxScrollPct = 0;
    }

    if (events.length === 0) {
      return;
    }

    const batch = events;

    events = [];
    send(batch);
  };

  const onClick = (event: MouseEvent): void => {
    const target = event.target as Element | null;
    const root = document.documentElement;

    events.push({
      type: "click",
      x: Math.round(event.pageX),
      y: Math.round(event.pageY),
      pageWidth: root?.scrollWidth ?? 0,
      pageHeight: root?.scrollHeight ?? 0,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      ...(target && typeof target.closest === "function" ? { selector: getSelector(target) } : {}),
    });

    if (events.length >= MAX_EVENTS) {
      flush();
    }
  };

  const onScroll = (): void => {
    if (frame !== 0) {
      return;
    }

    frame = window.requestAnimationFrame(() => {
      frame = 0;

      const root = document.documentElement;
      const scrollable = (root?.scrollHeight ?? 0) - window.innerHeight;

      if (scrollable <= 0) {
        return;
      }

      const percentage = Math.min(100, Math.round((window.scrollY / scrollable) * 100));

      if (percentage > maxScrollPct) {
        maxScrollPct = percentage;
      }
    });
  };

  const onVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") {
      flush();
    }
  };

  document.addEventListener("click", onClick, true);
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", onVisibilityChange, true);
  window.addEventListener("pagehide", flush);

  timer = setInterval(flush, FLUSH_INTERVAL);

  return {
    flush,
    stop: () => {
      if (timer !== undefined) {
        clearInterval(timer);
      }

      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }

      document.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibilityChange, true);
      window.removeEventListener("pagehide", flush);
    },
  };
};
