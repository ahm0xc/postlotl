import type { EventData } from "./types";

const EVENT_ATTRIBUTE = "data-track";
const EVENT_DATA_PREFIX = `${EVENT_ATTRIBUTE}-`;

export type ClickTracker = {
  stop: () => void;
};

export type ClickSender = (name: string, data: EventData) => void;

const readEventData = (element: Element): EventData => {
  const data: EventData = {};

  for (const name of element.getAttributeNames()) {
    if (!name.startsWith(EVENT_DATA_PREFIX)) {
      continue;
    }

    const value = element.getAttribute(name);

    if (value !== null) {
      data[name.slice(EVENT_DATA_PREFIX.length)] = value;
    }
  }

  return data;
};

export const startClicks = (sendEvent: ClickSender): ClickTracker => {
  const { document } = window;

  const onClick = (event: MouseEvent): void => {
    const target = event.target as Element | null;

    if (!target || typeof target.closest !== "function") {
      return;
    }

    const element = target.closest(`[${EVENT_ATTRIBUTE}]`);
    const name = element?.getAttribute(EVENT_ATTRIBUTE)?.trim();

    if (!element || !name) {
      return;
    }

    sendEvent(name, readEventData(element));
  };

  document.addEventListener("click", onClick, true);

  return {
    stop: () => document.removeEventListener("click", onClick, true),
  };
};
