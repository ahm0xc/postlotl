import type { TrackerConfig } from "./config";
import type { PayloadOptions } from "./options";
import type {
  BasePayload,
  CustomEvent,
  ErrorPayload,
  ErrorReport,
  EventData,
  EventDataValue,
  Heatmap,
  HeatmapEvent,
  Identify,
  Identity,
  Pageview,
  Performance,
  VitalsMetrics,
} from "./types";

const MAX_TITLE_LENGTH = 500;
const MAX_EVENT_NAME_LENGTH = 50;
const MAX_VALUE_LENGTH = 500;
const MAX_DATA_KEYS = 50;
const MAX_DATA_DEPTH = 3;
const NUMBER_PRECISION = 4;

const truncate = (value: string, max: number): string =>
  value.length > max ? value.slice(0, max) : value;

const sanitizeValue = (
  value: EventDataValue | undefined,
  depth: number,
): EventDataValue | undefined => {
  if (value === null || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? Number(value.toFixed(NUMBER_PRECISION)) : undefined;
  }

  if (typeof value === "string") {
    return truncate(value, MAX_VALUE_LENGTH);
  }

  if (Array.isArray(value)) {
    return truncate(
      value.map((item) => (item === null || item === undefined ? "" : String(item))).join(","),
      MAX_VALUE_LENGTH,
    );
  }

  if (typeof value === "object" && depth < MAX_DATA_DEPTH) {
    return sanitizeEventData(value, depth + 1);
  }

  return undefined;
};

export const sanitizeEventData = (
  data: EventData | undefined,
  depth = 0,
): EventData | undefined => {
  if (!data) {
    return undefined;
  }

  const result: EventData = {};

  for (const [key, value] of Object.entries(data)) {
    if (Object.keys(result).length >= MAX_DATA_KEYS) {
      break;
    }

    const sanitized = sanitizeValue(value, depth);

    if (sanitized !== undefined) {
      result[truncate(key, MAX_VALUE_LENGTH)] = sanitized;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
};

export const normalizeReferrer = (referrer: string, origin: string): string | undefined => {
  if (!referrer) {
    return undefined;
  }

  let url: URL;

  try {
    url = new URL(referrer);
  } catch {
    return undefined;
  }

  if (url.origin === origin) {
    return `${url.pathname}${url.search}${url.hash}`;
  }

  return url.href;
};

const getTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    return "";
  }
};

export const createBasePayload = (
  config: TrackerConfig,
  identity: Identity,
  options: PayloadOptions = {},
): BasePayload => {
  const { location, screen, document, navigator } = window;

  return {
    projectSlug: config.projectSlug,
    visitorId: identity.visitorId,
    sessionId: identity.sessionId,
    url: options.url ?? location.href,
    title: truncate(options.title ?? document.title, MAX_TITLE_LENGTH),
    screen: `${screen.width}x${screen.height}`,
    language: navigator.language,
    timezone: getTimezone(),
    timestamp: Date.now(),
    ...(options.referrer ? { referrer: options.referrer } : {}),
  };
};

export const createPageview = (
  config: TrackerConfig,
  identity: Identity,
  options?: PayloadOptions,
): Pageview => ({
  type: "pageview",
  payload: createBasePayload(config, identity, options),
});

export const createEvent = (
  config: TrackerConfig,
  identity: Identity,
  name: string,
  data?: EventData,
  options?: PayloadOptions,
): CustomEvent => ({
  type: "event",
  payload: {
    ...createBasePayload(config, identity, options),
    name: truncate(name.trim(), MAX_EVENT_NAME_LENGTH),
    data: sanitizeEventData(data),
  },
});

export const createIdentify = (
  config: TrackerConfig,
  identity: Identity,
  distinctId: string,
  traits?: EventData,
): Identify => ({
  type: "identify",
  payload: {
    ...createBasePayload(config, identity),
    distinctId: distinctId.trim(),
    traits: sanitizeEventData(traits),
  },
});

export const createPerformance = (
  config: TrackerConfig,
  identity: Identity,
  metrics: VitalsMetrics,
  options?: PayloadOptions,
): Performance => ({
  type: "performance",
  payload: {
    ...createBasePayload(config, identity, options),
    ...metrics,
  },
});

export const createError = (
  config: TrackerConfig,
  identity: Identity,
  report: ErrorReport,
): ErrorPayload => ({
  type: "error",
  payload: {
    ...createBasePayload(config, identity),
    ...report,
  },
});

export const createHeatmap = (
  config: TrackerConfig,
  identity: Identity,
  events: HeatmapEvent[],
): Heatmap => ({
  type: "heatmap",
  payload: {
    ...createBasePayload(config, identity),
    events,
  },
});
