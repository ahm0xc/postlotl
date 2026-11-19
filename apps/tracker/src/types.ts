export type EventDataValue = string | number | boolean | null | EventDataValue[] | EventData;

export interface EventData {
  [key: string]: EventDataValue | undefined;
}

export type Identity = {
  visitorId: string;
  sessionId: string;
};

export type BasePayload = {
  projectSlug: string;
  visitorId: string;
  sessionId: string;
  url: string;
  title: string;
  screen: string;
  language: string;
  timezone: string;
  timestamp: number;
  referrer?: string;
};

export type Pageview = {
  type: "pageview";
  payload: BasePayload;
};

export type CustomEvent = {
  type: "event";
  payload: BasePayload & {
    name: string;
    data?: EventData;
  };
};

export type Identify = {
  type: "identify";
  payload: BasePayload & {
    distinctId: string;
    traits?: EventData;
  };
};

export type VitalsMetrics = {
  lcp?: number;
  inp?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  duration: number;
};

export type Performance = {
  type: "performance";
  payload: BasePayload & VitalsMetrics;
};

export type ErrorReport = {
  name: string;
  message: string;
  stack?: string;
  source?: string;
  line?: number;
  column?: number;
};

export type ErrorPayload = {
  type: "error";
  payload: BasePayload & ErrorReport;
};

export type HeatmapClick = {
  type: "click";
  x: number;
  y: number;
  pageWidth: number;
  pageHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  selector?: string;
};

export type HeatmapScroll = {
  type: "scroll";
  scrollPct: number;
};

export type HeatmapEvent = HeatmapClick | HeatmapScroll;

export type Heatmap = {
  type: "heatmap";
  payload: BasePayload & {
    events: HeatmapEvent[];
  };
};

export type CollectBody = Pageview | CustomEvent | Identify | Performance | ErrorPayload | Heatmap;
