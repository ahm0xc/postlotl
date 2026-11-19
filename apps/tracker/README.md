# @postlotl/tracker

The Postlotl browser tracker script. One self-contained IIFE, no dependencies, no cookies. It exposes `window.postlotl` and posts events to the ingest API.

- Build output: `dist/script.js` (~13 KB minified with every module enabled)
- Runtime: ES2020, `fetch` with `keepalive`
- Storage: `sessionStorage` for the session id only

## Develop

```bash
pnpm --filter @postlotl/tracker build   # esbuild -> dist/script.js
pnpm --filter @postlotl/tracker test    # vitest + jsdom
pnpm --filter @postlotl/tracker check-types
```

## Install

```html
<script
  defer
  src="https://cdn.postlotl.com/script.js"
  data-project-slug="acme"
  data-host="https://api.postlotl.com"
></script>
```

| Attribute            | Required | Default | Description                                                                                                              |
| -------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| `data-project-slug`  | yes      | —       | Project the events belong to                                                                                             |
| `data-host`          | yes      | —       | Absolute origin of the ingest API; must be `https` except for localhost/private addresses. Trailing slashes are stripped |
| `data-auto-pageview` | no       | `true`  | Set to `false` to send pageviews manually with `postlotl.page()`                                                         |
| `data-performance`   | no       | `false` | Collect Core Web Vitals                                                                                                  |
| `data-errors`        | no       | `false` | Capture uncaught errors and rejections                                                                                   |
| `data-heatmaps`      | no       | `false` | Collect click and scroll points                                                                                          |

A missing or invalid `data-project-slug` / `data-host` throws an `[postlotl] …` error instead of failing silently. `http` is accepted only for `localhost`, `127.0.0.1`, `::1`, `*.localhost`, `*.local`, `*.test` and private IPv4 ranges; a remote `http` host throws because the browser would block it as mixed content on an HTTPS site. The script is a no-op if `window.postlotl` already holds a tracker object.

## API

```js
postlotl.page(); // pageview for the current page
postlotl.page({ url: "/virtual", title: "Virtual step" });

postlotl.track("signup"); // named event
postlotl.track("signup", { plan: "pro" }); // event with data

postlotl.identify("user_123", { plan: "pro" }); // link this visitor to your user
```

All methods return `void` and send in the background. `track()` trims the name and drops empty names. `identify()` trims the id and drops empty ids.

### Pre-init queue

Calls made before the script loads can be queued. If `window.postlotl` is an array when the script runs, every entry is replayed in order and the array is replaced by the real tracker.

```html
<script>
  window.postlotl = window.postlotl || [];
  window.postlotl.push(["track", "early_event", { source: "header" }]);
  window.postlotl.push(["page", { url: "/landing" }]);
  window.postlotl.push(["identify", "user_123", { plan: "pro" }]);
</script>
```

### Declarative events

```html
<button data-track="signup" data-track-plan="pro" data-track-seats="12">Sign up</button>
```

- `data-track` is the event name.
- Every `data-track-*` attribute becomes a string property in `data` (`plan: "pro"`, `seats: "12"`).
- Clicks are captured in the capture phase, so app handlers that stop propagation cannot swallow them.
- `closest("[data-track]")` is used, so clicks on children of a tracked element count.
- Navigation is never delayed; the hit is sent with `keepalive`.

## What is sent

`POST {host}/api/collect` with `Content-Type: application/json`, `credentials: "omit"`, and `keepalive: true`.

```json
{ "type": "pageview", "payload": { "...": "..." } }
```

| Type          | When                                               |
| ------------- | -------------------------------------------------- |
| `pageview`    | Initial load, SPA navigation, or `postlotl.page()` |
| `event`       | `postlotl.track()` or a `data-track` click         |
| `identify`    | `postlotl.identify()`                              |
| `performance` | `data-performance="true"`, per route               |
| `error`       | `data-errors="true"`, on uncaught errors           |
| `heatmap`     | `data-heatmaps="true"`, in batches                 |

Common payload fields:

| Field         | Description                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `projectSlug` | From the script tag                                                                              |
| `visitorId`   | 32-char fingerprint hash                                                                         |
| `sessionId`   | Session identifier from `sessionStorage`                                                         |
| `url`         | Absolute page URL                                                                                |
| `title`       | `document.title`, truncated to 500                                                               |
| `screen`      | `WIDTHxHEIGHT`                                                                                   |
| `language`    | `navigator.language`                                                                             |
| `timezone`    | IANA timezone from `Intl`                                                                        |
| `timestamp`   | `Date.now()` in milliseconds; the server stamps receipt separately                               |
| `referrer`    | Only on the first pageview of a new session; full URL for external, path-only for self-referrals |

Event `data` limits: 50 keys, 500 chars per string, numbers rounded to 4 decimals, arrays joined with commas, nesting capped at 3 levels, functions and `NaN` dropped.

## Identity

**`visitorId`** is computed in the browser and never stored:

1. Collect signals: normalized user agent (version stripped), platform, vendor, languages, timezone, screen size/avail size/color depth/pixel depth, `devicePixelRatio`, `hardwareConcurrency`, `deviceMemory`, `maxTouchPoints`, `pdfViewerEnabled`, `cookieEnabled`, WebGL vendor/renderer/version, a canvas scene, 24 font probes, and an `OfflineAudioContext` rendering.
2. Join with `|`, hash with SHA-256, truncate to 32 hex characters.
3. Cache the result for the lifetime of the page.

Consequences: the same device + browser + settings always produce the same id, including after the browser is closed and reopened. Any change in those signals (browser update, monitor, language, fonts) produces a new id, and two identical devices produce the same id.

If `crypto.subtle` is unavailable, a deterministic 128-bit JavaScript hash is used instead.

**`sessionId`** lives in `sessionStorage` under `postlotl:session:<projectSlug>`. A session ends after 30 minutes without activity. If storage is unavailable or rejects writes, an in-memory map is used for the lifetime of the page, so the id stays stable within that page. The referrer is attached only when a new session is created, not on every reload.

**`identify()`** sends the fingerprint `visitorId` plus `distinctId` and `traits`. A visitor maps to one project identity at a time; the server replaces the link and upserts traits. The client sends every call, so trait changes are not lost.

## Modules

### Web Vitals (`data-performance="true"`)

Collects `ttfb`, `fcp`, `lcp`, `cls` (session-window algorithm, worst window) and `inp` (98th percentile per `interactionId`, 40 ms threshold), plus route `duration`. Flushed on route change, tab hidden, `pagehide`, or 10 seconds after the route starts. Each route produces at most one row; after the 10-second send the route is not re-sent. Route detection runs independently of `data-auto-pageview`, so manual `postlotl.page()` callers still get one row per route on routers that use the history API.

### Errors (`data-errors="true"`)

Listens for `error` and `unhandledrejection`. Reports `name`, `message` (1 KB), `stack` (2 KB), `source`, `line`, `column`. Duplicates within a page load are suppressed by `name|message|source|line`, and at most 20 reports are sent per page. Retries up to 3 times with 1 s / 3 s / 5 s backoff on network errors and 5xx responses. `4xx` responses are not retried. The client cap is only a guard against request storms on the visitor's device; the server-side rate limit described below is the authoritative control.

### Heatmaps (`data-heatmaps="true"`)

Records clicks (`x`, `y`, page size, viewport size, short selector) and the maximum scroll percentage per page. Batches up to 50 events and flushes every 10 seconds, on tab hidden, and on `pagehide`. Selectors are `#id` or `tag.class1.class2` — no ancestor paths.

## Ingest contract

The script expects the server to:

1. Answer CORS preflight (`OPTIONS`) for the site origin, allowing `POST` and `Content-Type`.
2. Accept `POST /api/collect` with a JSON body and suppress nothing except oversized payloads (>60 KB is dropped client-side).
3. Enforce the project's allowed origins server-side. The tracker sends no write key; requests from disallowed origins should be ignored without an error the client can act on.
4. Rate limit per project, origin and IP at the edge (token bucket). The script can be cached on customer sites indefinitely and `visitorId`/`sessionId`/`distinctId` are client-controlled, so the server must be the authority on volume and identity writes.
5. Return any response. The client ignores the status and body entirely.

The server is also responsible for deriving IP, user agent, geo, device and bot classification, and for parsing the URL into host/path/query plus UTM and ad click ids.

## Browser support

- ES2020 syntax (Chrome 87+, Edge 88+, Firefox 78+, Safari 14+)
- `fetch` with `keepalive`
- `crypto.subtle` for SHA-256, with a JS fallback
- Optional modules degrade silently when an API is missing (`PerformanceObserver`, `OfflineAudioContext`, canvas)
