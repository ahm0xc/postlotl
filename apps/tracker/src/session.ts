import type { TrackerConfig } from "./config";

const SESSION_TIMEOUT = 30 * 60 * 1000;

type Session = {
  id: string;
  lastActivity: number;
};

const memorySessions = new Map<string, Session>();

const getStorageKey = (config: TrackerConfig): string => `postlotl:session:${config.projectSlug}`;

const createSessionId = (): string => {
  if (typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

const readSession = (key: string): Session | undefined => {
  try {
    const raw = window.sessionStorage.getItem(key);

    if (!raw) {
      return memorySessions.get(key);
    }

    const parsed = JSON.parse(raw) as Session;

    return typeof parsed?.id === "string" && typeof parsed.lastActivity === "number"
      ? parsed
      : undefined;
  } catch {
    return memorySessions.get(key);
  }
};

const writeSession = (key: string, session: Session): void => {
  memorySessions.set(key, session);

  try {
    window.sessionStorage.setItem(key, JSON.stringify(session));
  } catch {
    return;
  }
};

export type SessionState = {
  id: string;
  isNew: boolean;
};

export const getSession = (config: TrackerConfig): SessionState => {
  const key = getStorageKey(config);
  const now = Date.now();
  const stored = readSession(key);
  const isNew = !stored || now - stored.lastActivity >= SESSION_TIMEOUT;
  const session: Session = {
    id: stored && !isNew ? stored.id : createSessionId(),
    lastActivity: now,
  };

  writeSession(key, session);

  return { id: session.id, isNew };
};
