import type { ErrorReport } from "./types";

const MAX_MESSAGE_LENGTH = 1_000;
const MAX_STACK_LENGTH = 2_000;
const MAX_ERROR_REPORTS = 20;

export type ErrorTracker = {
  stop: () => void;
};

export type ErrorSender = (report: ErrorReport) => void;

const truncate = (value: string, max: number): string =>
  value.length > max ? value.slice(0, max) : value;

const normalizeReason = (reason: unknown): ErrorReport => {
  if (reason instanceof Error) {
    return { name: reason.name, message: reason.message, stack: reason.stack };
  }

  if (typeof reason === "string") {
    return { name: "Error", message: reason };
  }

  try {
    return { name: "Error", message: JSON.stringify(reason) ?? String(reason) };
  } catch {
    return { name: "Error", message: String(reason) };
  }
};

export const startErrors = (send: ErrorSender): ErrorTracker => {
  const { location } = window;
  const seen = new Set<string>();
  let reportCount = 0;

  const report = (
    candidate: ErrorReport,
    source?: string,
    line?: number,
    column?: number,
  ): void => {
    const normalized: ErrorReport = {
      name: candidate.name,
      message: truncate(candidate.message, MAX_MESSAGE_LENGTH),
      ...(candidate.stack ? { stack: truncate(candidate.stack, MAX_STACK_LENGTH) } : {}),
      source: source ?? location.href,
      ...(line !== undefined ? { line } : {}),
      ...(column !== undefined ? { column } : {}),
    };

    const key = `${normalized.name}|${normalized.message}|${normalized.source}|${normalized.line ?? ""}`;

    if (seen.has(key) || reportCount >= MAX_ERROR_REPORTS) {
      return;
    }

    seen.add(key);
    reportCount += 1;
    send(normalized);
  };

  const onError = (event: ErrorEvent): void => {
    if (!event.message) {
      return;
    }

    const error = event.error instanceof Error ? event.error : undefined;

    report(
      {
        name: error?.name ?? "Error",
        message: event.message,
        stack: error?.stack,
      },
      event.filename,
      event.lineno,
      event.colno,
    );
  };

  const onRejection = (event: PromiseRejectionEvent): void => {
    report(normalizeReason(event.reason));
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return {
    stop: () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    },
  };
};
