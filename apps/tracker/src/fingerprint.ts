const FONT_LIST = [
  "Arial",
  "Courier New",
  "Georgia",
  "Times New Roman",
  "Verdana",
  "Trebuchet MS",
  "Tahoma",
  "Comic Sans MS",
  "Impact",
  "Garamond",
  "Palatino Linotype",
  "Lucida Console",
  "Monaco",
  "Menlo",
  "Consolas",
  "Segoe UI",
  "Roboto",
  "Ubuntu",
  "Helvetica Neue",
  "Futura",
  "Calibri",
  "Cambria",
  "Optima",
  "Noto Sans",
];

type FingerprintNavigator = Navigator & {
  deviceMemory?: number;
  pdfViewerEnabled?: boolean;
};

type OfflineAudioContextConstructor = new (
  channels: number,
  length: number,
  sampleRate: number,
) => OfflineAudioContext;

const normalizeUserAgent = (userAgent: string): string =>
  userAgent
    .replace(
      /(Chrome|Chromium|Firefox|Safari|Edg|OPR|Googlebot|Version|CriOS|FxiOS)\/[\d.]+/g,
      "$1",
    )
    .replace(/(Windows NT|Mac OS X|Android|iPhone OS|CPU OS) [\d._]+/g, "$1");

const getTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    return "";
  }
};

const collectBasicSignals = (): string[] => {
  const { navigator, screen, devicePixelRatio } = window;
  const typedNavigator = navigator as FingerprintNavigator;
  const languages = navigator.languages?.length
    ? navigator.languages.join(",")
    : navigator.language;

  return [
    normalizeUserAgent(navigator.userAgent ?? ""),
    typedNavigator.platform ?? "",
    typedNavigator.vendor ?? "",
    languages,
    getTimezone(),
    `${screen.width}x${screen.height}x${screen.availWidth}x${screen.availHeight}`,
    String(screen.colorDepth),
    String(screen.pixelDepth),
    String(devicePixelRatio),
    String(typedNavigator.hardwareConcurrency ?? ""),
    String(typedNavigator.deviceMemory ?? ""),
    String(typedNavigator.maxTouchPoints ?? 0),
    String(typedNavigator.pdfViewerEnabled ?? ""),
    String(typedNavigator.cookieEnabled),
  ];
};

const collectWebglSignal = (): string => {
  try {
    const canvas = window.document.createElement("canvas");
    const context = canvas.getContext("webgl") as WebGLRenderingContext | null;

    if (!context) {
      return "";
    }

    const debugInfo = context.getExtension("WEBGL_debug_renderer_info");
    const vendor = debugInfo
      ? context.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
      : context.getParameter(context.VENDOR);
    const renderer = debugInfo
      ? context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : context.getParameter(context.RENDERER);
    const version = context.getParameter(context.VERSION);
    const shading = context.getParameter(context.SHADING_LANGUAGE_VERSION);

    return [vendor, renderer, version, shading].join("|");
  } catch {
    return "";
  }
};

const collectCanvasSignal = (): string => {
  try {
    const canvas = window.document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 60;

    const context = canvas.getContext("2d");

    if (!context) {
      return "";
    }

    context.textBaseline = "top";
    context.font = "14px Arial";
    context.fillStyle = "#f60";
    context.fillRect(10, 10, 80, 30);
    context.fillStyle = "#069";
    context.fillText("postlotl 🦦", 12, 22);
    context.fillStyle = "rgba(102,204,0,0.7)";
    context.fillText("fingerprint", 14, 40);

    const gradient = context.createLinearGradient(0, 0, 240, 60);
    gradient.addColorStop(0, "#f00");
    gradient.addColorStop(1, "#00f");
    context.fillStyle = gradient;
    context.fillRect(0, 50, 240, 10);

    return canvas.toDataURL();
  } catch {
    return "";
  }
};

const collectFontSignal = (): string => {
  try {
    const canvas = window.document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return "";
    }

    const text = "mmmmmmmmmmlli";
    const fallback = "monospace";

    context.font = `72px ${fallback}`;
    const fallbackWidth = context.measureText(text).width;

    return FONT_LIST.map((font) => {
      context.font = `72px "${font}", ${fallback}`;

      return context.measureText(text).width !== fallbackWidth ? "1" : "0";
    }).join("");
  } catch {
    return "";
  }
};

const collectAudioSignal = (): Promise<string> => {
  const AudioContextConstructor = (window.OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext?: OfflineAudioContextConstructor })
      .webkitOfflineAudioContext) as OfflineAudioContextConstructor | undefined;

  if (!AudioContextConstructor) {
    return Promise.resolve("");
  }

  try {
    const context = new AudioContextConstructor(1, 44100, 44100);
    const oscillator = context.createOscillator();
    const compressor = context.createDynamicsCompressor();

    oscillator.type = "triangle";
    oscillator.frequency.value = 10_000;
    oscillator.connect(compressor);
    compressor.connect(context.destination);
    oscillator.start(0);

    return context
      .startRendering()
      .then((buffer) => {
        const data = buffer.getChannelData(0);
        let sum = 0;

        for (let index = 0; index < data.length; index += 1) {
          sum += Math.abs(data[index] ?? 0);
        }

        return sum.toFixed(6);
      })
      .catch(() => "");
  } catch {
    return Promise.resolve("");
  }
};

const fallbackHash = (value: string): string => {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    h1 = h2 ^ Math.imul(h1 ^ code, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ code, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ code, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ code, 2716044179);
  }

  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);

  const parts = [h1 ^ h2 ^ h3 ^ h4, h2 ^ h1, h3 ^ h1, h4 ^ h1].map((part) =>
    (part >>> 0).toString(16).padStart(8, "0"),
  );

  return parts.join("");
};

const hash = async (value: string): Promise<string> => {
  const subtle = window.crypto?.subtle;

  if (!subtle) {
    return fallbackHash(value);
  }

  try {
    const digest = await subtle.digest("SHA-256", new TextEncoder().encode(value));

    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return fallbackHash(value);
  }
};

const computeVisitorId = async (): Promise<string> => {
  const signals = [
    ...collectBasicSignals(),
    collectWebglSignal(),
    collectCanvasSignal(),
    collectFontSignal(),
    await collectAudioSignal(),
  ];

  const digest = await hash(signals.join("|"));

  return digest.slice(0, 32);
};

let cachedVisitorId: Promise<string> | undefined;

export const getVisitorId = (): Promise<string> => {
  cachedVisitorId ??= computeVisitorId().catch((error: unknown) => {
    cachedVisitorId = undefined;
    throw error;
  });

  return cachedVisitorId;
};
