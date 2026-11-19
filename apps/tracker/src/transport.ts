import type { TrackerConfig } from "./config";
import type { CollectBody } from "./types";

const COLLECT_PATH = "/api/collect";
const MAX_KEEPALIVE_BYTES = 60_000;
const RETRY_DELAYS = [1_000, 3_000, 5_000];

export type SendOptions = {
  retries?: number;
};

const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

export const getCollectUrl = (host: string): string => `${host}${COLLECT_PATH}`;

export const sendCollect = async (
  config: TrackerConfig,
  body: CollectBody,
  options: SendOptions = {},
): Promise<void> => {
  const data = JSON.stringify(body);

  if (new TextEncoder().encode(data).byteLength > MAX_KEEPALIVE_BYTES) {
    return;
  }

  const url = getCollectUrl(config.host);
  const retries = options.retries ?? 0;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data,
        keepalive: true,
        credentials: "omit",
      });

      if (response.ok || response.status < 500) {
        return;
      }
    } catch {
      if (attempt >= retries) {
        return;
      }
    }

    if (attempt < retries) {
      await delay(RETRY_DELAYS[attempt] ?? 5_000);
    }
  }
};
