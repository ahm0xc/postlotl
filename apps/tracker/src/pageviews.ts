import { normalizeReferrer } from "./payload";

const NAVIGATION_DELAY = 300;

export type PageviewTracker = {
  stop: () => void;
};

export type PageviewSender = (referrer?: string) => void;

export const startPageviews = (
  sendPageview?: PageviewSender,
  onNavigate?: () => void,
): PageviewTracker => {
  const { document, history, location } = window;

  let currentUrl = location.href;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let isFirstPageview = true;

  const trackPageview = (): void => {
    const referrer = isFirstPageview
      ? normalizeReferrer(document.referrer, location.origin)
      : undefined;

    isFirstPageview = false;

    sendPageview?.(referrer);
  };

  const schedulePageview = (): void => {
    if (location.href === currentUrl) {
      return;
    }

    currentUrl = location.href;
    onNavigate?.();

    if (timer !== undefined) {
      clearTimeout(timer);
    }

    timer = setTimeout(trackPageview, NAVIGATION_DELAY);
  };

  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    schedulePageview();
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    schedulePageview();
  };

  window.addEventListener("popstate", schedulePageview);
  window.addEventListener("hashchange", schedulePageview);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", trackPageview, { once: true });
  } else {
    trackPageview();
  }

  return {
    stop: () => {
      window.removeEventListener("popstate", schedulePageview);
      window.removeEventListener("hashchange", schedulePageview);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;

      if (timer !== undefined) {
        clearTimeout(timer);
      }
    },
  };
};
