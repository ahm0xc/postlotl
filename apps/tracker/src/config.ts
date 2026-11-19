export type TrackerConfig = {
  projectSlug: string;
  host: string;
  autoPageview: boolean;
  performance: boolean;
  errors: boolean;
  heatmaps: boolean;
};

const ERROR_PREFIX = "[postlotl]";

const readAttribute = (script: HTMLOrSVGScriptElement | null, name: string): string | null =>
  script?.getAttribute(name)?.trim() || null;

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const LOCAL_HOSTNAME_SUFFIXES = [".localhost", ".local", ".test"];

const isLocalHostname = (hostname: string): boolean =>
  LOCAL_HOSTNAMES.has(hostname) ||
  LOCAL_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix)) ||
  hostname.startsWith("10.") ||
  hostname.startsWith("192.168.") ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

const parseHost = (raw: string | null): string => {
  if (!raw) {
    throw new Error(`${ERROR_PREFIX} missing data-host attribute on the tracker script`);
  }

  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${ERROR_PREFIX} data-host must be an absolute URL, received "${raw}"`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`${ERROR_PREFIX} data-host must be an http(s) URL, received "${raw}"`);
  }

  if (url.protocol === "http:" && !isLocalHostname(url.hostname)) {
    throw new Error(
      `${ERROR_PREFIX} data-host must use https, received "${raw}"; http is only allowed for local addresses`,
    );
  }

  url.search = "";
  url.hash = "";

  const pathname = url.pathname.replace(/\/+$/, "");

  return `${url.origin}${pathname}`;
};

export const readConfig = (script: HTMLOrSVGScriptElement | null): TrackerConfig => {
  const projectSlug = readAttribute(script, "data-project-slug");

  if (!projectSlug) {
    throw new Error(`${ERROR_PREFIX} missing data-project-slug attribute on the tracker script`);
  }

  return {
    projectSlug,
    host: parseHost(readAttribute(script, "data-host")),
    autoPageview: readAttribute(script, "data-auto-pageview") !== "false",
    performance: readAttribute(script, "data-performance") === "true",
    errors: readAttribute(script, "data-errors") === "true",
    heatmaps: readAttribute(script, "data-heatmaps") === "true",
  };
};
